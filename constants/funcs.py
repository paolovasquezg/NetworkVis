import unicodedata
from selenium.webdriver.common.by import By


def Text(driver, selector, default=""):
    try:
        return driver.find_element(By.CSS_SELECTOR, selector).text.strip()
    except Exception:
        return default


def Texts(driver, selector):
    try:
        return [e.text.strip() for e in driver.find_elements(By.CSS_SELECTOR, selector) if e.text.strip()]
    except Exception:
        return []


def Attr(driver, selector, attribute, default=""):
    try:
        return driver.find_element(By.CSS_SELECTOR, selector).get_attribute(attribute) or default
    except Exception:
        return default


def Normalize(s):
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")
