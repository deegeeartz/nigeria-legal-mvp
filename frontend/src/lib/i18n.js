const translations = {
  en: {
    hero: {
      title: "Find the Right Legal Help in Nigeria",
      subtitle: "Verified lawyers, secure consultations, and transparent pricing."
    },
    common: {
      book: "Book Consultation",
      search: "Search Lawyers",
      loading: "Loading..."
    }
  },
  pcm: {
    hero: {
      title: "Find Beta Lawyer for Naija",
      subtitle: "Verified lawyers, secure talk, and price wey clear."
    },
    common: {
      book: "Book Talk",
      search: "Find Lawyer",
      loading: "Wait small..."
    }
  }
};

export function getTranslation(lang, key) {
  const keys = key.split('.');
  let result = translations[lang] || translations.en;
  for (const k of keys) {
    result = result[k];
    if (!result) return key;
  }
  return result;
}
