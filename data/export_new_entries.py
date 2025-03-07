import json
import os
import pandas as pd
import glob
from datetime import datetime

# Get current directory and find Excel files
current_dir = os.path.dirname(os.path.abspath(__file__))
excel_files = glob.glob(os.path.join(current_dir, 'KMatch - *.xlsx'))

def extract_date(filename):
    date_str = os.path.basename(filename).split(' - ')[1].replace('.xlsx', '')
    return datetime.strptime(date_str, '%d_%m_%Y')

# Sort files by date (newest first)
sorted_files = sorted(excel_files, key=extract_date, reverse=True)

if len(sorted_files) < 2:
    print("Need at least 2 files to compare")
    exit()

latest_file = sorted_files[0]
second_latest_file = sorted_files[1]

# Read Excel files
latest_df = pd.read_excel(latest_file)
second_latest_df = pd.read_excel(second_latest_file)

# Find new entries
new_entries = latest_df[~latest_df.iloc[:, 1].isin(second_latest_df.iloc[:, 1])]

# Create output filename with current date
current_date = datetime.now().strftime('%d_%m_%Y')
output_filename = f'new_entries_{current_date}.xlsx'
output_path = os.path.join(current_dir, output_filename)

# Export to Excel
if len(new_entries) > 0:
    new_entries.to_excel(output_path, index=False)
    print(f"\nFound {len(new_entries)} new entries")
    print(f"Exported to: {output_filename}")
else:
    print("\nNo new entries found") 