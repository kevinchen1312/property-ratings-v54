#!/usr/bin/env python3
"""
Script to download and analyze property survey photos from CSV data
"""

import csv
import requests
import os
from urllib.parse import urlparse
import json

def extract_photo_data_from_csv(csv_file_path):
    """Extract photo URLs and associated data from the survey CSV"""
    photo_data = []
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        # Handle semicolon-separated values
        reader = csv.DictReader(file, delimiter=';')
        
        for row in reader:
            if row.get('How does the property look right now?_URL'):
                photo_info = {
                    'address': row.get('What is the address of the property you are rating?', '').strip('"'),
                    'photo_url': row.get('How does the property look right now?_URL', '').strip('"'),
                    'photo_filename': row.get('How does the property look right now?', '').strip('"'),
                    'latitude': row.get('_Please verify your proximity to the property you are rating_latitude', '').strip('"'),
                    'longitude': row.get('_Please verify your proximity to the property you are rating_longitude', '').strip('"'),
                    'quiet_rating': row.get('How quiet is the property right now?', '').strip('"'),
                    'safe_rating': row.get('How safe is the property right now?', '').strip('"'),
                    'clean_rating': row.get('How clean is the property right now?', '').strip('"'),
                    'friendly_rating': row.get('How friendly is the property right now?', '').strip('"'),
                    'submission_time': row.get('_submission_time', '').strip('"'),
                    'uuid': row.get('_uuid', '').strip('"')
                }
                photo_data.append(photo_info)
    
    return photo_data

def download_photos(photo_data, download_dir='survey_photos'):
    """Download photos from URLs (if accessible)"""
    if not os.path.exists(download_dir):
        os.makedirs(download_dir)
    
    downloaded_photos = []
    
    for i, photo in enumerate(photo_data):
        try:
            print(f"Attempting to download photo {i+1}/{len(photo_data)}: {photo['photo_filename']}")
            
            response = requests.get(photo['photo_url'], timeout=10)
            
            if response.status_code == 200:
                # Create safe filename
                safe_filename = f"{i+1:02d}_{photo['photo_filename']}"
                file_path = os.path.join(download_dir, safe_filename)
                
                with open(file_path, 'wb') as f:
                    f.write(response.content)
                
                photo['local_path'] = file_path
                downloaded_photos.append(photo)
                print(f"✅ Downloaded: {safe_filename}")
            else:
                print(f"❌ Failed to download {photo['photo_filename']}: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error downloading {photo['photo_filename']}: {str(e)}")
    
    return downloaded_photos

def analyze_photo_metadata(photo_data):
    """Analyze the photo metadata and survey responses"""
    print("\n📊 SURVEY PHOTO ANALYSIS")
    print("=" * 50)
    
    # Group by address
    addresses = {}
    for photo in photo_data:
        addr = photo['address']
        if addr not in addresses:
            addresses[addr] = []
        addresses[addr].append(photo)
    
    print(f"\n🏠 Properties Surveyed: {len(addresses)}")
    print(f"📸 Total Photos: {len(photo_data)}")
    
    for address, photos in addresses.items():
        print(f"\n📍 {address}")
        print(f"   Photos: {len(photos)}")
        
        # Analyze ratings for this property
        ratings = {
            'quiet': [p['quiet_rating'] for p in photos if p['quiet_rating'] and p['quiet_rating'].isdigit()],
            'safe': [p['safe_rating'] for p in photos if p['safe_rating'] and p['safe_rating'].isdigit()],
            'clean': [p['clean_rating'] for p in photos if p['clean_rating'] and p['clean_rating'].isdigit()],
            'friendly': [p['friendly_rating'] for p in photos if p['friendly_rating'] and p['friendly_rating'].isdigit()]
        }
        
        for category, values in ratings.items():
            if values:
                avg_rating = sum(int(v) for v in values) / len(values)
                print(f"   {category.capitalize()}: {avg_rating:.1f}/5 ({len(values)} ratings)")
    
    return addresses

def generate_import_script(photo_data):
    """Generate SQL script to import this data into your app"""
    sql_script = """
-- Import survey data into property ratings app
-- Run this in your Supabase SQL editor

-- First, let's insert the properties if they don't exist
"""
    
    addresses = set(photo['address'] for photo in photo_data)
    
    for address in addresses:
        # Get first photo's coordinates for this address
        photo = next(p for p in photo_data if p['address'] == address)
        lat = photo['latitude']
        lng = photo['longitude']
        
        sql_script += f"""
INSERT INTO property (name, address, lat, lng) 
VALUES ('{address}', '{address}', {lat}, {lng})
ON CONFLICT (address) DO NOTHING;
"""
    
    sql_script += """
-- Now insert ratings (you'll need to map to actual user IDs)
-- This is a template - adjust user_id values as needed
"""
    
    for photo in photo_data:
        if any([photo['quiet_rating'], photo['safe_rating'], photo['clean_rating'], photo['friendly_rating']]):
            sql_script += f"""
-- Ratings for {photo['address']} at {photo['submission_time']}
"""
            if photo['quiet_rating'] and photo['quiet_rating'].isdigit():
                sql_script += f"-- Quiet: {photo['quiet_rating']}/5\n"
            if photo['safe_rating'] and photo['safe_rating'].isdigit():
                sql_script += f"-- Safe: {photo['safe_rating']}/5\n"
            if photo['clean_rating'] and photo['clean_rating'].isdigit():
                sql_script += f"-- Clean: {photo['clean_rating']}/5\n"
            if photo['friendly_rating'] and photo['friendly_rating'].isdigit():
                sql_script += f"-- Friendly: {photo['friendly_rating']}/5\n"
    
    with open('import_survey_data.sql', 'w') as f:
        f.write(sql_script)
    
    print(f"\n📝 Generated import_survey_data.sql")

def main():
    csv_file = input("Enter path to your CSV file: ").strip()
    
    if not os.path.exists(csv_file):
        print(f"❌ File not found: {csv_file}")
        return
    
    print("🔍 Extracting photo data from CSV...")
    photo_data = extract_photo_data_from_csv(csv_file)
    
    if not photo_data:
        print("❌ No photo data found in CSV")
        return
    
    print(f"✅ Found {len(photo_data)} photos in survey data")
    
    # Analyze metadata
    addresses = analyze_photo_metadata(photo_data)
    
    # Try to download photos
    print(f"\n📥 Attempting to download photos...")
    downloaded = download_photos(photo_data)
    
    if downloaded:
        print(f"✅ Successfully downloaded {len(downloaded)} photos")
    else:
        print("ℹ️  Photos may require authentication to access")
    
    # Generate import script
    generate_import_script(photo_data)
    
    # Save analysis results
    with open('survey_analysis.json', 'w') as f:
        json.dump(photo_data, f, indent=2)
    
    print(f"\n📊 Analysis complete!")
    print(f"   - survey_analysis.json: Detailed data")
    print(f"   - import_survey_data.sql: Database import script")
    if downloaded:
        print(f"   - survey_photos/: Downloaded images")

if __name__ == "__main__":
    main()
