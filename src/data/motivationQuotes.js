// 800 motivation quotes for the 6 AM notification (openers x middles x closers).
// CommonJS so both the app (Metro) and Node scripts can load it.

const openers = [
  "Progress begins with a single intentional choice",
  "Your future responds to what you repeat today",
  "Consistency is a quiet form of self-belief",
  "Small effort becomes strong momentum over time",
  "The next level starts with the next decision",
  "Discipline turns ordinary days into meaningful change",
  "Clarity grows when action replaces overthinking",
  "A focused mind can change the direction of a week",
  "Every patient step builds a stronger result",
  "Your habits are voting for your future every day",
  "A calm pace can still create powerful progress",
  "Confidence is built through repeated proof",
  "You do not need a perfect start to begin well",
  "Steady effort is how big goals become real",
  "One honest attempt can reset an entire mindset",
  "Momentum loves the person who keeps returning",
  "Your best work often begins before you feel ready",
  "The right routine can carry you through hard days",
  "Growth becomes easier when you stay consistent",
  "A better life is shaped by better daily choices",
];

const middles = [
  "when you keep showing up",
  "when you protect your focus",
  "when you choose progress over excuses",
  "when you keep your promises to yourself",
  "when you take the next useful step",
];

const closers = [
  "and momentum starts to work for you.",
  "and confidence follows the habit.",
  "and the goal stops feeling distant.",
  "and your energy becomes a useful tool.",
  "and the work begins to feel natural.",
  "and the results become easier to trust.",
  "and you start to notice real change.",
  "and discipline turns into freedom.",
];

const quotes = [];

openers.forEach((opener) => {
  middles.forEach((middle) => {
    closers.forEach((closer) => {
      quotes.push(`${opener} ${middle} ${closer}`);
    });
  });
});

if (quotes.length !== 800) {
  throw new Error(`Expected 800 motivation quotes, got ${quotes.length}`);
}

module.exports = {
  quotes,
  totalQuotes: quotes.length,
};
