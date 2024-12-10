import requests
from bs4 import BeautifulSoup
import pandas as pd

def get_sponsors():
    url = "https://ind.nl/en/public-register-recognised-sponsors/public-register-regular-labour-and-highly-skilled-migrants"
    
    # Get the page content
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Find the table
    table = soup.find('table')
    
    # Extract headers and rows
    headers = []
    for th in table.find_all('th'):
        headers.append(th.text.strip())
    
    rows = []
    for tr in table.find_all('tr')[1:]:  # Skip header row
        row = []
        for td in tr.find_all('td'):
            row.append(td.text.strip())
        if row:  # Only add non-empty rows
            rows.append(row)
    
    # Create DataFrame
    df = pd.DataFrame(rows, columns=headers)
    
    # Save to Excel
    df.to_excel('recognized_sponsors.xlsx', index=False)
    print(f"Saved {len(rows)} sponsors to recognized_sponsors.xlsx")

if __name__ == "__main__":
    get_sponsors()