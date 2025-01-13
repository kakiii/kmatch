import pandas as pd
import json
from datetime import datetime

# Read existing sponsors.json
with open('sponsors.json', 'r', encoding='utf-8') as f:
    sponsors_data = json.load(f)

# Read Excel file and drop empty rows
df = pd.read_excel('new_entries.xlsx').dropna()

# Check required column exists
if 'Organization Name' not in df.columns:
    raise ValueError("Column 'Organisation' not found. Available columns are: " + ", ".join(df.columns))

# Process each organization
for _, row in df.iterrows():
    company = row['Organization Name']
    words = company.lower().split(' ')
    
    # Generate base_name from first word, keeping only alphanumeric characters
    base_name = ''.join(e for e in words[0] if e.isalnum())
    
    # Add to sponsors data
    if base_name not in sponsors_data["sponsors"]:
        sponsors_data["sponsors"][base_name] = []
    if company not in sponsors_data["sponsors"][base_name]:
        sponsors_data["sponsors"][base_name].append(company)

# Sort the sponsors dictionary by keys
sponsors_data["sponsors"] = dict(sorted(sponsors_data["sponsors"].items()))

# Update lastUpdated date
sponsors_data["lastUpdated"] = datetime.now().strftime("%Y-%m-%d")

# Write the updated JSON file
with open('sponsors.json', 'w', encoding='utf-8') as f:
    json.dump(sponsors_data, f, indent=2, ensure_ascii=False)