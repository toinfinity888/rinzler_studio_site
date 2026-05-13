from pathlib import Path
import pandas as pd
import re

INPUT_PATH = Path("/Users/saraevsviatoslav/Documents/rinzler_studio_web_site/db_hotels/les_hotels_classes_en_ile-de-france.csv")

OUTPUT_DIR = INPUT_PATH.parent / "filtered_leads"
OUTPUT_DIR.mkdir(exist_ok=True)

OUTPUT_FILE = OUTPUT_DIR / "hotels_hubspot_companies_import.csv"

CHAIN_KEYWORDS = [
    "ibis", "mercure", "novotel", "adagio", "accor",
    "b&b", "b & b", "campanile", "kyriad",
    "premiere classe", "première classe",
    "best western", "holiday inn", "hilton", "marriott",
    "moxy", "radisson", "residhome", "appart'city",
    "appart city", "citadines", "adagio access", "okko",
    "mama shelter", "motel one", "citizenm", "easyhotel",
    "hotelF1", "hotel f1", "hyatt", "sheraton", "courtyard",
    "pullman", "sofitel", "mgallery", "tribe", "greet",
    "jo&joe", "jo and joe",
]

CHAIN_DOMAIN_KEYWORDS = [
    "accor", "all.accor", "bestwestern", "booking.com",
    "expedia", "logishotels", "theoriginalshotels",
    "contact-hotel", "hotel-bb", "campanile", "kyriad",
    "premiereclasse", "premièreclasse", "marriott", "hilton",
    "ihg", "radisson", "citadines", "adagio", "residhome",
    "appartcity", "hyatt", "sofitel", "pullman",
]

A_PLUS_DEPARTMENTS = ["75", "92", "94"]
CORE_DEPARTMENTS = ["75", "92", "93", "94"]
EXTENDED_DEPARTMENTS = ["77", "78", "91", "95"]


def read_csv_safely(path: Path) -> pd.DataFrame:
    attempts = [
        {"sep": ";", "encoding": "utf-8-sig"},
        {"sep": ",", "encoding": "utf-8-sig"},
        {"sep": ";", "encoding": "latin1"},
        {"sep": ",", "encoding": "latin1"},
    ]

    last_error = None

    for options in attempts:
        try:
            return pd.read_csv(path, **options)
        except Exception as error:
            last_error = error

    raise last_error


def normalize_text(value) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip().lower()


def clean_text(value) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


def extract_star_rating(value):
    if pd.isna(value):
        return None

    text = normalize_text(value)
    match = re.search(r"([1-5])", text)

    if not match:
        return None

    return int(match.group(1))


def clean_int(value):
    if pd.isna(value):
        return None

    text = str(value).strip()
    match = re.search(r"\d+", text)

    if not match:
        return None

    return int(match.group(0))


def has_value(value) -> bool:
    if pd.isna(value):
        return False

    text = normalize_text(value)

    return text not in ["", "nan", "none", "null", "-", "n/a"]


def has_website(value) -> bool:
    return has_value(value)


def has_email(value) -> bool:
    return has_value(value) and "@" in str(value)


def has_phone(value) -> bool:
    return has_value(value)


def contains_any(text: str, keywords: list[str]) -> bool:
    text = normalize_text(text)
    return any(keyword.lower() in text for keyword in keywords)


def normalize_domain(value) -> str:
    """
    Converts website URL into a clean domain.
    Example:
    https://www.hotel-example.com/fr -> hotel-example.com
    """
    if pd.isna(value):
        return ""

    text = str(value).strip().lower()

    if not text:
        return ""

    text = re.sub(r"^https?://", "", text)
    text = re.sub(r"^www\.", "", text)
    text = text.split("/")[0]
    text = text.split("?")[0]
    text = text.strip()

    return text


def is_obvious_chain(row) -> bool:
    name = normalize_text(row.get("nom_commercial", ""))
    website = normalize_text(row.get("site_internet", ""))

    return contains_any(name, CHAIN_KEYWORDS) or contains_any(website, CHAIN_DOMAIN_KEYWORDS)


def department_group(value) -> str:
    dep = str(value).strip()

    if dep in A_PLUS_DEPARTMENTS:
        return "a_plus_geo"

    if dep in CORE_DEPARTMENTS:
        return "core"

    if dep in EXTENDED_DEPARTMENTS:
        return "extended"

    return "other"


def calculate_priority_score(row) -> int:
    score = 0

    stars = row.get("star_rating_clean")
    rooms = row.get("rooms_clean")
    dep_group = row.get("department_group")
    website = row.get("has_website_clean")
    email = row.get("has_email_clean")
    phone = row.get("has_phone_clean")
    chain = row.get("is_obvious_chain")

    if stars == 3:
        score += 5
    elif stars in [2, 4]:
        score += 2

    if rooms is not None:
        if 20 <= rooms <= 35:
            score += 5
        elif 15 <= rooms <= 19:
            score += 2
        elif 36 <= rooms <= 40:
            score += 2

    if dep_group == "a_plus_geo":
        score += 5
    elif dep_group == "core":
        score += 3
    elif dep_group == "extended":
        score += 2

    if website:
        score += 3

    if email:
        score += 3

    if phone:
        score += 1

    if chain:
        score -= 10

    return score


def assign_segment(row) -> str:
    stars = row.get("star_rating_clean")
    rooms = row.get("rooms_clean")
    dep_group = row.get("department_group")
    website = row.get("has_website_clean")
    email = row.get("has_email_clean")
    phone = row.get("has_phone_clean")
    chain = row.get("is_obvious_chain")
    score = row.get("priority_score")

    if chain:
        return "excluded_chains"

    if not website:
        return "excluded_no_website"

    core_criteria = (
        stars in [2, 3, 4]
        and rooms is not None
        and 15 <= rooms <= 40
    )

    if not core_criteria:
        return "excluded_outside_core_criteria"

    # A+:
    # First outreach wave.
    # 3-star, 20–35 rooms, Paris only, has email + phone, has website, non-chain.
    if (
        stars == 3
        and 20 <= rooms <= 35
        and dep_group == "a_plus_geo"
        and normalize_text(row.get("commune", "")) == "paris"
        and email
        and phone
        and score >= 20
    ):
        return "a_plus_priority"

    # A:
    if (
        stars == 3
        and 15 <= rooms <= 35
        and dep_group in ["a_plus_geo", "core"]
        and score >= 15
    ):
        return "a_priority"

    # B:
    if (
        stars in [2, 3, 4]
        and 15 <= rooms <= 40
        and dep_group in ["a_plus_geo", "core", "extended"]
        and score >= 11
    ):
        return "b_priority"

    return "c_priority"


# Read source file
df = read_csv_safely(INPUT_PATH)

required_columns = [
    "departement",
    "classement",
    "nom_commercial",
    "site_internet",
    "courriel",
    "telephone",
    "nombre_de_chambres",
]

missing_columns = [col for col in required_columns if col not in df.columns]

if missing_columns:
    raise ValueError(f"Missing required columns: {missing_columns}")

# Clean/scoring columns
df["star_rating_clean"] = df["classement"].apply(extract_star_rating)
df["rooms_clean"] = df["nombre_de_chambres"].apply(clean_int)
df["has_website_clean"] = df["site_internet"].apply(has_website)
df["has_email_clean"] = df["courriel"].apply(has_email)
df["has_phone_clean"] = df["telephone"].apply(has_phone)
df["is_obvious_chain"] = df.apply(is_obvious_chain, axis=1)
df["department_group"] = df["departement"].apply(department_group)
df["priority_score"] = df.apply(calculate_priority_score, axis=1)
df["lead_segment"] = df.apply(assign_segment, axis=1)

# HubSpot base fields
df["lead_category"] = "Hotel"
df["lead_source"] = "IDF classified hotels database"
df["import_batch"] = "Hotels_IDF_May2026"
df["icp"] = "Independent hotels 15-40 rooms in Île-de-France"
df["outreach_status"] = "New lead"
df["personal_observation"] = ""
df["next_action"] = "Check website"
df["follow_up_date"] = ""

df["company_name"] = df["nom_commercial"].apply(clean_text)
df["company_domain_name"] = df["site_internet"].apply(normalize_domain)
df["phone_number"] = df["telephone"].apply(clean_text)

if "commune" in df.columns:
    df["city"] = df["commune"].apply(clean_text)
else:
    df["city"] = ""

if "adresse" in df.columns:
    df["street_address"] = df["adresse"].apply(clean_text)
else:
    df["street_address"] = ""

if "code_postal" in df.columns:
    df["postal_code"] = df["code_postal"].apply(clean_text)
else:
    df["postal_code"] = ""

# Sort all hotels by score
df_sorted = df.sort_values(
    by=["priority_score", "star_rating_clean", "rooms_clean"],
    ascending=[False, False, True],
).copy()

# Mark first wave: top 30 A+ leads
df_sorted["first_wave"] = False
a_plus_index = df_sorted[df_sorted["lead_segment"] == "a_plus_priority"].head(30).index
df_sorted.loc[a_plus_index, "first_wave"] = True

# Create clean Companies-only import file for HubSpot
companies_df = pd.DataFrame()

companies_df["Company name"] = df_sorted["company_name"]
companies_df["Company domain name"] = df_sorted["company_domain_name"]
companies_df["Website URL"] = df_sorted["site_internet"]
companies_df["Phone number"] = df_sorted["phone_number"]
companies_df["City"] = df_sorted["city"]
companies_df["Street address"] = df_sorted["street_address"]
companies_df["Postal code"] = df_sorted["postal_code"]

companies_df["Lead category"] = df_sorted["lead_category"]
companies_df["Lead segment"] = df_sorted["lead_segment"]
companies_df["Lead source"] = df_sorted["lead_source"]
companies_df["Import batch"] = df_sorted["import_batch"]
companies_df["ICP"] = df_sorted["icp"]
companies_df["Outreach status"] = df_sorted["outreach_status"]

companies_df["Priority score"] = df_sorted["priority_score"]
companies_df["First wave"] = df_sorted["first_wave"].map({True: "Yes", False: "No"})
companies_df["Number of rooms"] = df_sorted["rooms_clean"]
companies_df["Stars"] = df_sorted["star_rating_clean"]

companies_df["Personal observation"] = df_sorted["personal_observation"]
companies_df["Next action"] = df_sorted["next_action"]
companies_df["Follow-up date"] = df_sorted["follow_up_date"]

# Keep only first wave for the first HubSpot import.
# If you later want to import all companies, comment out the next line.
companies_df = companies_df[companies_df["First wave"] == "Yes"].copy()

# Remove rows without company name
companies_df = companies_df[
    companies_df["Company name"].astype(str).str.strip().ne("")
].copy()

# Remove rows without domain to reduce duplicate risk in HubSpot
companies_df = companies_df[
    companies_df["Company domain name"].astype(str).str.strip().ne("")
].copy()

companies_df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")

print("HubSpot Companies import file created.")
print(f"Rows saved: {len(companies_df)}")
print(f"File saved to: {OUTPUT_FILE}")