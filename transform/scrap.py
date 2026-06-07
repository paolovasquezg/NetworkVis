import json
import os
import sys
import time
import re
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from constants.funcs import Text, Texts, Attr
from constants.consts import (DATA_DIR, SCRAP_URL, REQUEST_DELAY_SECS, OUTPUT_FILE, CHROME_VERSION)


def MakeDriver():
    opts = uc.ChromeOptions()
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--lang=es-PE")
    return uc.Chrome(options=opts, version_main=CHROME_VERSION)


# ── Profile URLs ── #
def ScrapePersonUrls(driver):

    collected_urls = []
    current_page = 0

    while True:
        page_url = f"{SCRAP_URL}?page={current_page}"
        print(f"Page {current_page}", end=" ")
        driver.get(page_url)
        time.sleep(5)

        try:
            WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.CSS_SELECTOR, "h3.title a")))
        except Exception:
            break

        time.sleep(1.5)

        profile_link_elements = driver.find_elements(By.CSS_SELECTOR, "h3.title a")
        page_profile_urls = []
        
        for link_element in profile_link_elements:
            link_href = link_element.get_attribute("href") or ""
            
            if "/es/persons/" in link_href and link_href not in collected_urls:
                page_profile_urls.append(link_href)

        if not page_profile_urls:
            break

        collected_urls.extend(page_profile_urls)
        print(f"-> {len(page_profile_urls)}")
        current_page += 1
        time.sleep(REQUEST_DELAY_SECS)

    return list(dict.fromkeys(collected_urls))


# ── Individual profiles ── # 
def ScrapePersonProfile(driver, profile_url):
    driver.get(profile_url)
    time.sleep(REQUEST_DELAY_SECS)

    person_data = {"profile_url": profile_url}
    person_data["name"] = Text(driver, "h1.title")

    try:
        email_element = driver.find_element(By.CSS_SELECTOR, "a[href^='mailto:']")
        person_data["email"] = email_element.get_attribute("href").replace("mailto:", "").strip()
    except Exception:
        person_data["email"] = ""

    person_data["photo_url"] = Attr(driver, "img.rendering_portrait, figure img", "src")

    department_elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='/organisations/']")
    department_names = [e.text.strip() for e in department_elements if "departamento" in e.text.lower()]
    person_data["department"] = department_names[0] if department_names else ""

    organization_elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='/organisations/']")
    research_group_names = []
    
    for element in organization_elements:
        element_text = element.text.strip()
        if (element_text and "universidad" not in element_text.lower() and "utec" not in element_text.lower() and "departamento" not in element_text.lower()):
            research_group_names.append(element_text)

    person_data["research_groups"] = "; ".join(dict.fromkeys(research_group_names))

    keyword_list = Texts(driver, "div.fingerprint span.concept-badge, " "ul.keywords li span, ""div.research-topics li")
    person_data["research_areas"] = "; ".join(keyword_list)

    person_data["h_index"]   = None
    person_data["citations"] = None
    try:
        page_body_text = driver.find_element(By.TAG_NAME, "body").text
        
        for line in page_body_text.splitlines():
            
            line = line.strip()
            line_lower = line.lower()
            numbers_found = re.findall(r"[\d,]+", line)
            
            if ("h-index" in line_lower or "h index" in line_lower) and numbers_found and person_data["h_index"] is None:
                person_data["h_index"] = int(numbers_found[0].replace(",", ""))
            
            if ("citations" in line_lower or "citas" in line_lower) and numbers_found and person_data["citations"] is None:
                person_data["citations"] = int(numbers_found[0].replace(",", ""))
    
    except Exception:
        pass

    publication_elements = driver.find_elements(By.CSS_SELECTOR, "li.research-output-result, li.rendering_researchoutput")
    person_data["publication_count"] = len(publication_elements)

    return person_data


def Scrap():
    os.makedirs(DATA_DIR, exist_ok=True)
    driver = MakeDriver()

    try:
        print("\nCollecting profile URLs...")
        persons_urls = ScrapePersonUrls(driver)

        if not persons_urls:
            return

        print(f"\nScraping profiles...")
        all_profiles = []
        
        for index, person_url in enumerate(persons_urls, 1):
            
            profile_slug = person_url.rstrip("/").split("/")[-1][:55]
            print(f"{profile_slug}")
            
            person_profile = ScrapePersonProfile(driver, person_url)
            all_profiles.append(person_profile)

        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(all_profiles, f, ensure_ascii=False, indent=2)

        print(f"\n{len(all_profiles)} profiles saved")

    finally:
        driver.quit()

if __name__ == "__main__":
    Scrap()
