window.WORDS = window.WORDS || [];
window.SEED_ATTEMPTS = window.SEED_ATTEMPTS || [];

window.loadClesData = async function loadClesData() {
  const wordFiles = [
    "data/words_part1.json",
    "data/words_part2.json",
    "data/words_part3.json"
  ];

  const wordChunks = await Promise.all(wordFiles.map(async (file) => {
    const res = await fetch(file, { cache: "force-cache" });
    if (!res.ok) throw new Error(file + " could not be loaded");
    return await res.json();
  }));

  let seedAttempts = [];
  try {
    const seedRes = await fetch("data/seed_attempts.json", { cache: "force-cache" });
    if (seedRes.ok) seedAttempts = await seedRes.json();
  } catch (e) {
    seedAttempts = [];
  }

  return {
    words: wordChunks.flat(),
    seedAttempts
  };
};
