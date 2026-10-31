export type ProductPhoto = {
  uri: string;
  author: string;
  license: string;
  sourceUrl: string;
};

const photos: { keywords: RegExp; photo: ProductPhoto }[] = [
  {
    keywords: /\barroz\b/,
    photo: {
      uri: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/Uncooked_ST25_rice_on_bamboo_surface.jpg/500px-Uncooked_ST25_rice_on_bamboo_surface.jpg',
      author: 'VinhNguyen.1257',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Uncooked_ST25_rice_on_bamboo_surface.jpg',
    },
  },
  {
    keywords: /\btomate\b/,
    photo: {
      uri: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/89/Tomato_je.jpg/500px-Tomato_je.jpg',
      author: 'Softeis',
      license: 'CC BY-SA 3.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tomato_je.jpg',
    },
  },
  {
    keywords: /\b(carne|res|cerdo|pollo)\b/,
    photo: {
      uri: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/FoodMeat.jpg/500px-FoodMeat.jpg',
      author: 'Fotógrafo desconocido · National Cancer Institute (NCI)',
      license: 'Dominio público',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:FoodMeat.jpg',
    },
  },
  {
    keywords: /\bpan\b/,
    photo: {
      uri: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/da/No-Knead_Bread_-_Finished_Loaf_%28294068096%29.jpg/500px-No-Knead_Bread_-_Finished_Loaf_%28294068096%29.jpg',
      author: 'daisybush',
      license: 'CC BY 2.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:No-Knead_Bread_-_Finished_Loaf_(294068096).jpg',
    },
  },
];

function normalizeProductName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getProductPhoto(name: string): ProductPhoto | undefined {
  const normalizedName = normalizeProductName(name);
  return photos.find(({ keywords }) => keywords.test(normalizedName))?.photo;
}
