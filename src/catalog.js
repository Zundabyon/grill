// One playable WJazzD chart per tune. Source IDs are retained for attribution.
// These are arrangements from specific performances, not a canonical lead sheet.
export const STANDARD_CHARTS = [
  {id:266,title:'All the Things You Are'},
  {id:329,title:"Bag's Groove"},
  {id:52,title:"Billie's Bounce"},
  {id:218,title:'Blue Train'},
  {id:21,title:'Bye Bye Blackbird'},
  {id:420,title:'If I Were a Bell'},
  {id:210,title:"I Can't Get Started"},
  {id:70,title:'I Fall in Love Too Easily'},
  {id:90,title:"I'll Remember April"},
  {id:224,title:'Impressions'},
  {id:71,title:'Just Friends'},
  {id:179,title:'Lady Bird'},
  {id:226,title:'Mr. P.C.'},
  {id:24,title:'Night and Day'},
  {id:109,title:'No Greater Love'},
  {id:320,title:'Oleo'},
  {id:157,title:'On Green Dolphin Street'},
  {id:62,title:'Out of Nowhere'},
  {id:94,title:'Sandu'},
  {id:323,title:'So What'},
  {id:113,title:'Softly as in a Morning Sunrise'},
  {id:385,title:'St. Thomas'},
  {id:377,title:'Summertime'},
  {id:387,title:'Tenor Madness'},
  {id:41,title:'The Nearness of You'},
  {id:325,title:'Tune Up'},
  {id:51,title:'Work Song'},
  {id:68,title:'Yardbird Suite'},
  {id:77,title:"You'd Be So Nice to Come Home to"},
  {id:1,title:'Anthropology'},
];
export function standardSongs(songs) {
  const byId = new Map(songs.map(song=>[song.id,song]));
  return STANDARD_CHARTS.map(chart=>{
    const song=byId.get(chart.id);
    if(!song || song.title!==chart.title || !song.supported) throw new Error(`スタンダード曲の資料を確認してください：${chart.title}`);
    return song;
  }).sort((a,b)=>a.title.localeCompare(b.title,'en'));
}
export function filterSongs(songs,query='') {
  const normalized=query.normalize('NFKC').trim().toLowerCase().replace(/[’‘]/g,"'");
  return songs.filter(song=>(song.title+' '+song.performer).normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").includes(normalized));
}
