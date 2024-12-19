import pandas as pd
import json
from datetime import datetime
import re

# Read Excel file
df = pd.read_excel('recognized_sponsors.xlsx')

# Print column names to see what's available
print("Available columns:", df.columns.tolist())

# Add this check before the loop
if 'Organisation' not in df.columns:
    raise ValueError("Column 'Organisation' not found. Available columns are: " + ", ".join(df.columns))

# Create a mapping for known discrepancies
name_corrections = {
    "Institute for DiagNostic Accuracy Consulting BV": "iDNA - The Institute for DiagNostic Accuracy",
    "Institute for Housing and Urban Development Studies BV": "IHS, Institute for Housing and Urban Development Studies of Erasmus University Rotterdam"
}

# Create sponsors dictionary
sponsors_data = {
    "lastUpdated": datetime.now().strftime("%Y-%m-%d"),
    "sponsors": {}
}

# Group similar company names
for _, row in df.iterrows():
    company = row['Organisation']
    company = company.replace('.', '')

    # 应用名称修正
    if company in name_corrections:
        company = name_corrections[company]

    words = company.lower().split(' ')

    # 处理以 "den"、"delta" 或 "erasmus" 开头的公司名称
    if words[0] in ["den", "delta", "erasmus"]:
        base_name = f"{words[0]}-" + '-'.join(words[1:])  # 使用 "den"、"delta" 或 "erasmus" 作为前缀
        if base_name not in sponsors_data["sponsors"]:
            sponsors_data["sponsors"][base_name] = []
        if company not in sponsors_data["sponsors"][base_name]:  # 防止重复
            sponsors_data["sponsors"][base_name].append(company)
        continue

    # Handle companies starting with specific words separately
    if words[0] in ["world", "multi", "institute"]:
        if len(words) > 1:
            base_name = f"{words[0]}-{words[1]}"
            if base_name not in sponsors_data["sponsors"]:
                sponsors_data["sponsors"][base_name] = []
            sponsors_data["sponsors"][base_name] = [company]  # Only include this company
        continue
    
    # Handle companies starting with specific prefixes differently
    if words[0] in ["the", "total", "van"]:
        if len(words) > 1:
            # Use first two words as the key for van
            if words[0] == "van":
                # Handle "Van der" and "Van den" specially
                if len(words) > 2 and words[1] in ["der", "den"]:
                    base_name = f"{words[0]}-{words[1]}-{words[2]}"
                else:
                    base_name = f"{words[0]}-{words[1]}"
            else:
                base_name = f"{words[0]}-{words[1]}"
            
            # Add the full company name to a new list
            if base_name not in sponsors_data["sponsors"]:
                sponsors_data["sponsors"][base_name] = []
            sponsors_data["sponsors"][base_name] = [company]  # Only include this company
        continue
    
    # Special handling for universities and similar institutions
    if words[0] in ["universe", "universitair", "universiteit", "university"]:
        # For Dutch universities, use the location as part of the key
        if words[0] == "universiteit":
            if "van" in words:
                # Handle "Universiteit van X"
                location_index = words.index("van") + 1
                if location_index < len(words):
                    base_name = f"universiteit-{words[location_index]}"
            else:
                # Handle "Universiteit X"
                if len(words) > 1:
                    base_name = f"universiteit-{words[1]}"
        else:
            # For other university-related organizations, use full name
            base_name = '-'.join(words)
        
        if base_name not in sponsors_data["sponsors"]:
            sponsors_data["sponsors"][base_name] = []
        sponsors_data["sponsors"][base_name] = [company]
        continue
    
    # Normal handling for other companies
    base_name = ''.join(e.lower() for e in words[0] if e.isalnum())
    
    # Special handling for other specific prefixes
    if base_name in ["independent", "machinefabriek"]:
        if len(words) > 1:
            base_name = f"{words[0]}-{words[1]}"
    
    if base_name not in sponsors_data["sponsors"]:
        sponsors_data["sponsors"][base_name] = []
    sponsors_data["sponsors"][base_name].append(company)

# Write the JSON file
with open('sponsors.json', 'w', encoding='utf-8') as f:
    json.dump(sponsors_data, f, indent=2, ensure_ascii=False)