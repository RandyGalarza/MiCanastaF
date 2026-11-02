/** Fotos reales verificadas para coincidencias concretas de marca, producto y presentación. */
export function getVerifiedProductImage(name: string, brand?: string | null): string | undefined {
  const product = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const brandText = brand?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() ?? '';

  if (/aceite de girasol puro 1000\s?ml/.test(product) && /diana/.test(brandText)) {
    return 'https://mistiendas.com.co/21227-large_default/aceite-diana-premium-x1000ml.jpg';
  }
  if (/arroz.*1000\s?g|arroz.*1\s?kg/.test(product) && /diana/.test(brandText)) {
    return 'https://carulla.vtexassets.com/arquivos/ids/21680928/Arroz-Diana-1000-gr-552155_a.jpg?v=638864002499370000';
  }
  if (/arroz.*1000\s?g|arroz.*1\s?kg/.test(product) && /roa/.test(brandText)) {
    return 'https://mercaldas.vtexassets.com/arquivos/ids/1307236/Arroz-ROA-x-1000-g_42619.jpg?v=638176817636300000';
  }
  if (/leche.*(1000\s?ml|1\s?l)/.test(product) && /colanta/.test(brandText)) {
    return 'https://carulla.vtexassets.com/arquivos/ids/23206566/Leche-Uht-Entera-COLANTA-1000-ml-3202767_a.jpg?v=638931939959900000';
  }
  if (/pasta.*tornillo.*500\s?g/.test(product) && /doria/.test(brandText)) {
    return 'https://olimpica.vtexassets.com/arquivos/ids/1785605/7702085013496_1.png.png?v=638762294254900000';
  }
  if (/harina de maiz blanco precocida.*1\s?kg/.test(product) && /(^|\b)(p\.a\.n|pan)(\b|$)/.test(brandText)) {
    return 'https://exitocol.vtexassets.com/arquivos/ids/29102268/Harina-Pan-Maiz-Blanca-X-1000-gr-200963_a.jpg?v=638881203791130000';
  }
  if (/leche entera larga vida.*900\s?ml/.test(product) && /alqueria/.test(brandText)) {
    return 'https://www.merkadomi.com/wp-content/uploads/2018/07/IMG_2186-800x600-600x600.jpg';
  }
  if (/galletas saltin tradicional.*3 tacos/.test(product) && /noel/.test(brandText)) {
    return 'https://eurosuper.vtexassets.com/arquivos/ids/184621/7702025185344.png?v=638551880704430000';
  }
  if (/cafe tostado y molido tradicional.*500\s?g/.test(product) && /sello rojo/.test(brandText)) {
    return 'https://misaboracolombia.com/cdn/shop/products/CafeelloRojo500g_2048x2048.jpg?v=1668401691';
  }
  if (/aceite gourmet canola.*900\s?ml/.test(product) && /gourmet/.test(brandText)) {
    return 'https://exitocol.vtexassets.com/arquivos/ids/29609783/Aceite-Canola-GOURMET-900-ml-3202786_a.jpg?v=638906030842670000';
  }
  if (/crema dental triple accion.*150\s?ml/.test(product) && /colgate/.test(brandText)) {
    return 'https://www.colgate.com/content/dam/cp-sites-aem/oral-care/oral-care-center/pim/es_co/toothpaste/empty-property/fmx00035b-front-packshot.jpg';
  }
  if (/salsa de tomate tradicional.*400\s?g/.test(product) && /fruco/.test(brandText)) {
    return 'https://olimpica.vtexassets.com/arquivos/ids/1874527-800-450?aspect=true&height=450&v=638857849857070000&width=800';
  }
  if (/huevos rojos tipo aa.*30 unidades/.test(product) && /santa anita/.test(brandText)) {
    return 'https://carulla.vtexassets.com/arquivos/ids/24167194/HUEVO-ROJO-AA-30UND-EMPACADO-1120034_a.jpg?v=639005637168130000';
  }
  if (/chocolate de mesa en pastillas.*500\s?g/.test(product) && /corona/.test(brandText)) {
    return 'https://mecato.shop/cdn/shop/products/chocolate-corona-2.jpg?v=1642794947';
  }
  if (/pan tajado blanco familiar/.test(product) && /bimbo/.test(brandText)) {
    return 'https://carulla.vtexassets.com/arquivos/ids/25035708/Pan-BIMBO-BLANCO-SUAVE-ESPONJOSO-600-gr-3663323_a.jpg?v=639129242283000000';
  }
  if (/salchichas tradicionales.*12/.test(product) && /zenu/.test(brandText)) {
    return 'https://carulla.vtexassets.com/arquivos/ids/23781129/Salchicha-Perro-Caliente-X-12-Unds-254995_a.jpg?v=638974567681000000';
  }
  if (/harina de maiz promasa.*1\s?kg/.test(product) && /promasa/.test(brandText)) {
    return 'https://media.surtiplaza.co/dimen/7702084137414.png';
  }
  return undefined;
}
