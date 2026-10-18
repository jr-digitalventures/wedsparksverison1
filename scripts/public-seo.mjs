const text=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
export function structuredData({url,title,description,article=false,crumbs=[]},origin){
 const org=origin+'/#organization',site=origin+'/#website';
 const graph=[{'@type':'Organization','@id':org,name:'WedSparks',url:origin+'/',logo:origin+'/assets/wedsparks-mark.svg'},
 {'@type':'WebSite','@id':site,name:'WedSparks',url:origin+'/',publisher:{'@id':org}},
 {'@type':article?'Article':'WebPage','@id':url+'#page',url,name:text(title),...(article?{headline:text(title),author:{'@type':'Organization',name:'WedSparks',url:origin+'/about/'}}:{}),description:text(description),isPartOf:{'@id':site},publisher:{'@id':org},...(crumbs.length?{breadcrumb:{'@id':url+'#breadcrumbs'}}:{})}];
 if(crumbs.length)graph.push({'@type':'BreadcrumbList','@id':url+'#breadcrumbs',itemListElement:crumbs.map(([name,item],i)=>({'@type':'ListItem',position:i+1,name:text(name),item}))});
 return `<script type="application/ld+json" data-public-seo>${JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')}</script>`;
}
export function applyPublicSeo(html,origin){
 if(/name=["']robots["'][^>]*noindex/i.test(html)||/data-supplier-page|data-supplier-profile|id="messages-root"/.test(html))return html;
 const url=html.match(/rel="canonical"\s+href="([^"]+)"/)?.[1];if(!url?.startsWith(origin+'/'))return html;
 const title=html.match(/<title>([^<]*)<\/title>/)?.[1]||'WedSparks',description=html.match(/name="description" content="([^"]*)"/)?.[1]||'';
 const article=html.includes('data-editorial-article');
 const crumbs=[['Home',origin+'/']];if(url!==origin+'/')crumbs.push([html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]||title,url]);
 html=html.replace(/<script type="application\/ld\+json" data-public-seo>[\s\S]*?<\/script>/g,'');
 return html.replace('</head>',structuredData({url,title,description,article,crumbs},origin)+'</head>');
}
