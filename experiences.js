/* Curated place-specific experiences. Photo thumbnails fetched from Wikipedia only when available. */
(function(g){'use strict';
const data={
'São Paulo':[['Avenida Paulista','Kunst, Museen und Stadtleben','Avenida Paulista'],['Parque Ibirapuera','Großer Stadtpark und Architektur','Ibirapuera Park'],['Mercado Municipal','Markthalle und regionale Küche','Municipal Market of São Paulo']],
'Paraty':[['Historische Altstadt','Kolonialarchitektur und Kopfsteinpflaster','Historic Centre of Paraty'],['Bootsausflug in die Bucht','Inseln und Strände','Paraty'],['Trindade','Küstenwanderung und Naturpools','Trindade, Rio de Janeiro']],
'Rio de Janeiro':[['Cristo Redentor','Aussicht vom Corcovado','Christ the Redeemer (statue)'],['Zuckerhut','Seilbahn und Blick auf die Guanabara-Bucht','Sugarloaf Mountain'],['Copacabana und Ipanema','Strände und Stadtleben','Copacabana, Rio de Janeiro']],
'Salvador':[['Pelourinho','Historisches Zentrum und afrobrasilianische Kultur','Pelourinho'],['Elevador Lacerda','Aussicht über die Allerheiligenbucht','Elevador Lacerda'],['Capoeira und Musik','Kultur und Live-Auftritte','Capoeira']],
'Chapada Diamantina':[['Vale do Pati','Mehrtagestrekking und Berglandschaften','Vale do Pati'],['Cachoeira da Fumaça','Spektakulärer Wasserfall','Cachoeira da Fumaça'],['Morro do Pai Inácio','Panoramablick bei Sonnenuntergang','Morro do Pai Inácio']],
'São Luís':[['Centro Histórico','Kolonialhäuser mit Azulejos','Historic Centre of São Luís'],['Bumba meu boi','Regionale Musik- und Festkultur','Bumba Meu Boi'],['Alcântara','Historische Kleinstadt als Ausflug','Alcântara, Maranhão']],
'Lençóis Maranhenses':[['Lagoa Azul','Lagunen zwischen weißen Dünen','Lençóis Maranhenses National Park'],['Lagoa Bonita','Dünenpanorama und Sonnenuntergang','Lençóis Maranhenses National Park'],['Atins','Dünen, Strand und Kitesurfing','Atins']],
'Belém':[['Ver-o-Peso','Traditioneller Markt am Hafen','Ver-o-Peso'],['Estação das Docas','Uferpromenade und Gastronomie','Estação das Docas'],['Ilha do Combu','Flussinsel und Kakaokultur','Ilha do Combu']],
'Medellín':[['Comuna 13','Street-Art und Stadtgeschichte','Comuna 13, Medellín'],['Metrocable','Seilbahnfahrt über die Hänge','Metrocable (Medellín)'],['Guatapé','Bunte Stadt und Felsen El Peñol','Guatapé']],
'Salento':[['Valle de Cocora','Wanderung zwischen Wachspalmen','Cocora Valley'],['Kaffee-Finca','Kaffeeanbau kennenlernen','Coffee production in Colombia'],['Filandia','Bunte Kleinstadt und Aussicht','Filandia, Quindío']],
'Minca / Tayrona':[['Parque Tayrona','Strände und Regenwaldwanderungen','Tayrona National Natural Park'],['Minca','Wasserfälle und Bergwald','Minca'],['Pozo Azul','Baden in natürlichen Pools','Minca']],
'Lima':[['Barranco','Street-Art und Küstenviertel','Barranco District'],['Historisches Zentrum','Plaza Mayor und Kolonialarchitektur','Historic Centre of Lima'],['Costa Verde','Küstenpromenade und Pazifikblick','Costa Verde, Lima']],
'Paracas':[['Islas Ballestas','Bootsausflug zur Tierwelt','Ballestas Islands'],['Reserva Nacional de Paracas','Wüstenküste und Strände','Paracas National Reserve'],['Playa Roja','Rötlicher Sandstrand','Playa Roja, Peru']],
'Huacachina':[['Sandboarding','Abfahrt auf hohen Sanddünen','Huacachina'],['Dünen-Buggy','Wüstenfahrt und Aussicht','Huacachina'],['Oase Huacachina','Lagune inmitten der Wüste','Huacachina']],
'Cusco':[['Machu Picchu','Inkastadt in den Anden','Machu Picchu'],['Montaña de Siete Colores','Rainbow Mountain als Höhenwanderung','Vinicunca'],['Sacsayhuamán','Inka-Festungsanlage oberhalb der Stadt','Sacsayhuamán']],
'Arequipa':[['Colca-Canyon','Trekking und Kondorbeobachtung','Colca Canyon'],['Kloster Santa Catalina','Historisches Kloster in der Stadt','Monastery of Santa Catalina de Siena'],['Plaza de Armas','Kolonialarchitektur und Vulkanblick','Plaza de Armas, Arequipa']],
'La Paz':[['Mi Teleférico','Seilbahn mit Andenpanorama','Mi Teleférico'],['Valle de la Luna','Erosionslandschaft nahe der Stadt','Valle de la Luna, Bolivia'],['Cholita Wrestling','Lokale Wrestling-Shows','Cholita wrestling']],
'Sucre':[['Historische Altstadt','Weiße Kolonialarchitektur','Sucre'],['Parque Cretácico','Dinosaurierspuren','Cal Orcko'],['Mercado Central','Regionale Küche und Marktleben','Sucre']],
'Uyuni':[['Salar de Uyuni','Gigantische Salzwüste','Salar de Uyuni'],['Isla Incahuasi','Kakteeninsel im Salzsee','Incahuasi Island'],['Laguna Colorada','Flamingos und Hochlandlagune','Laguna Colorada']],
'San Pedro de Atacama':[['Valle de la Luna','Wüstenlandschaft bei Sonnenuntergang','Valle de la Luna (Chile)'],['Geysers del Tatio','Geysire in großer Höhe','El Tatio'],['Lagunas Altiplánicas','Hochlandseen und Vulkanlandschaft','Miscanti Lake']],
'Valparaíso / Santiago':[['Cerro Alegre','Street-Art und bunte Hügel','Cerro Alegre'],['Valparaíso','Historische Hafenstadt','Valparaíso'],['Cerro San Cristóbal','Blick über Santiago und die Anden','San Cristóbal Hill']],
'Mendoza':[['Weingüter','Malbec und Weinregion','Mendoza wine'],['Parque General San Martín','Großer Stadtpark','General San Martín Park'],['Aconcagua','Andenpanorama und Wanderungen','Aconcagua']],
'Buenos Aires':[['San Telmo','Tango und historische Straßen','San Telmo, Buenos Aires'],['La Boca','Buntes Viertel Caminito','La Boca'],['Recoleta','Architektur und berühmter Friedhof','La Recoleta Cemetery']],
'Bariloche':[['Cerro Campanario','Panoramablick auf Seen und Berge','Cerro Campanario'],['Circuito Chico','Seenstraße und Aussichtspunkte','Circuito Chico'],['Nahuel Huapi','Nationalpark und Bergwanderungen','Nahuel Huapi National Park']],
'El Chaltén':[['Laguna de los Tres','Wanderung mit Blick auf Fitz Roy','Laguna de los Tres'],['Laguna Torre','Trekking zum Cerro Torre','Laguna Torre'],['Fitz Roy','Ikonisches Bergmassiv Patagoniens','Fitz Roy']],
'Torres del Paine':[['W-Trek','Mehrtägige Wanderung durch den Nationalpark','Torres del Paine National Park'],['Mirador Base Las Torres','Wanderung zu den Granittürmen','Torres del Paine National Park'],['Grey-Gletscher','Gletscher und Eislandschaft','Grey Glacier']]
};
function experiences(name){return data[name]||[]}
g.SouthboundExperiences={experiences};
})(typeof window!=='undefined'?window:globalThis);
