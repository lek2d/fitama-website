const normalize = text => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function matchesGuide(text, articleCategory, query, category = 'all') {
  return (category === 'all' || category === articleCategory)
    && normalize(query).trim().split(/\s+/).filter(Boolean).every(word => normalize(text).includes(word));
}

export function guideSearchResults(topics, query) {
  return topics.filter(topic => matchesGuide(topic.text, topic.category, query))
    .sort((a, b) => Number(matchesGuide(b.title, b.category, query)) - Number(matchesGuide(a.title, a.category, query)))
    .map(topic => {
      const excerpt = topic.excerpt.replace(/\s+/g, ' ').trim();
      return {...topic, excerpt: excerpt.length > 180 ? excerpt.slice(0, 180).replace(/\s+\S*$/, '') + '…' : excerpt};
    });
}
