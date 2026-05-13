from pathlib import Path
import pandas as pd
import re

INPUT_PATH = Path("/Users/saraevsviatoslav/Documents/rinzler_studio_web_site/db_hotels/les_hotels_classes_en_ile-de-france.csv")

OUTPUT_DIR = INPUT_PATH.parent / "filtered_leads"
OUTPUT_DIR.mkdir(exist_ok=True)

COMPANIES_OUTPUT_FILE = OUTPUT_DIR / "hotels_hubspot_companies_import.csv"
CONTACTS_OUTPUT_FILE = OUTPUT_DIR / "hotels_hubspot_contacts_import.csv"

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


def normalize_email(value) -> str:
    if pd.isna(value):
        return ""

    text = str(value).strip().lower()

    # If several emails are in one field, keep the first valid one.
    candidates = re.split(r"[;,/|\s]+", text)

    for candidate in candidates:
        candidate = candidate.strip()
        if re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", candidate):
            return candidate

    return ""


def email_local_part(email: str) -> str:
    if not email or "@" not in email:
        return ""
    return email.split("@")[0].lower().strip()


def infer_generic_contact_first_name(email: str) -> str:
    local = email_local_part(email)

    direction_aliases = [
        "direction", "directeur", "directrice", "dg", "gerance", "gérance",
        "manager", "management"
    ]

    reservation_aliases = [
        "reservation", "reservations", "réservation", "réservations",
        "booking", "resa", "résa"
    ]

    reception_aliases = [
        "reception", "réception", "frontdesk", "front-desk"
    ]

    contact_aliases = [
        "contact", "info", "hello", "bonjour", "mail", "hotel", "hôtel"
    ]

    if local in direction_aliases:
        return "Direction"

    if local in reservation_aliases:
        return "Réservations"

    if local in reception_aliases:
        return "Réception"

    if local in contact_aliases:
        return "Contact"

    return "Contact"


def infer_generic_contact_job_title(email: str) -> str:
    local = email_local_part(email)

    if local in ["direction", "directeur", "directrice", "dg", "gerance", "gérance"]:
        return "Direction"

    if local in ["reservation", "reservations", "réservation", "réservations", "booking", "resa", "résa"]:
        return "Réservations"

    if local in ["reception", "réception", "frontdesk", "front-desk"]:
        return "Réception"

    return "Contact hôtel"


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

    if (
        stars == 3
        and 15 <= rooms <= 35
        and dep_group in ["a_plus_geo", "core"]
        and score >= 15
    ):
        return "a_priority"

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
df["email_clean"] = df["courriel"].apply(normalize_email)
df["has_email_clean"] = df["email_clean"].apply(has_email)
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

# Keep only first wave for this import
first_wave_df = df_sorted[df_sorted["first_wave"] == True].copy()

# Remove rows without company name, domain, or email
first_wave_df = first_wave_df[
    first_wave_df["company_name"].astype(str).str.strip().ne("")
].copy()

first_wave_df = first_wave_df[
    first_wave_df["company_domain_name"].astype(str).str.strip().ne("")
].copy()

first_wave_df = first_wave_df[
    first_wave_df["email_clean"].astype(str).str.strip().ne("")
].copy()

# Create clean Companies-only import file for HubSpot
companies_df = pd.DataFrame()

companies_df["Company name"] = first_wave_df["company_name"]
companies_df["Company domain name"] = first_wave_df["company_domain_name"]
companies_df["Website URL"] = first_wave_df["site_internet"]
companies_df["Phone number"] = first_wave_df["phone_number"]
companies_df["City"] = first_wave_df["city"]
companies_df["Street address"] = first_wave_df["street_address"]
companies_df["Postal code"] = first_wave_df["postal_code"]

companies_df["Lead category"] = first_wave_df["lead_category"]
companies_df["Lead segment"] = first_wave_df["lead_segment"]
companies_df["Lead source"] = first_wave_df["lead_source"]
companies_df["Import batch"] = first_wave_df["import_batch"]
companies_df["ICP"] = first_wave_df["icp"]
companies_df["Outreach status"] = first_wave_df["outreach_status"]

companies_df["Priority score"] = first_wave_df["priority_score"]
companies_df["First wave"] = "Yes"
companies_df["Number of rooms"] = first_wave_df["rooms_clean"]
companies_df["Stars"] = first_wave_df["star_rating_clean"]

companies_df["Personal observation"] = first_wave_df["personal_observation"]
companies_df["Next action"] = first_wave_df["next_action"]
companies_df["Follow-up date"] = first_wave_df["follow_up_date"]

# Create Contacts import file for HubSpot
contacts_df = pd.DataFrame()

contacts_df["Email"] = first_wave_df["email_clean"]

contacts_df["First name"] = first_wave_df["email_clean"].apply(infer_generic_contact_first_name)
contacts_df["Last name"] = first_wave_df["company_name"].apply(lambda name: f"Hôtel {name}" if name else "")
contacts_df["Job title"] = first_wave_df["email_clean"].apply(infer_generic_contact_job_title)

contacts_df["Phone number"] = first_wave_df["phone_number"]
contacts_df["Company name"] = first_wave_df["company_name"]
contacts_df["Company domain name"] = first_wave_df["company_domain_name"]

contacts_df["Lead category"] = first_wave_df["lead_category"]
contacts_df["Lead segment"] = first_wave_df["lead_segment"]
contacts_df["Lead source"] = first_wave_df["lead_source"]
contacts_df["Import batch"] = first_wave_df["import_batch"]
contacts_df["ICP"] = first_wave_df["icp"]
contacts_df["Outreach status"] = first_wave_df["outreach_status"]

contacts_df["Priority score"] = first_wave_df["priority_score"]
contacts_df["First wave"] = "Yes"
contacts_df["Number of rooms"] = first_wave_df["rooms_clean"]
contacts_df["Stars"] = first_wave_df["star_rating_clean"]

contacts_df["Personal observation"] = first_wave_df["personal_observation"]
contacts_df["Next action"] = "Send first outreach email"
contacts_df["Follow-up date"] = first_wave_df["follow_up_date"]

# Remove duplicate contacts by email
contacts_df = contacts_df.drop_duplicates(subset=["Email"]).copy()

# Save files
companies_df.to_csv(COMPANIES_OUTPUT_FILE, index=False, encoding="utf-8-sig")
contacts_df.to_csv(CONTACTS_OUTPUT_FILE, index=False, encoding="utf-8-sig")

print("HubSpot import files created.")
print()
print(f"Companies rows saved: {len(companies_df)}")
print(f"Companies file saved to: {COMPANIES_OUTPUT_FILE}")
print()
print(f"Contacts rows saved: {len(contacts_df)}")
print(f"Contacts file saved to: {CONTACTS_OUTPUT_FILE}")