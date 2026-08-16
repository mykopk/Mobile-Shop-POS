import { prisma } from "../../core/lib/prisma";

export const DEFAULT_COLORS = [
  "Black",
  "Midnight",
  "Midnight Black",
  "Phantom Black",
  "Aura Black",
  "Space Grey",
  "Graphite",
  "Grey",
  "Silver",
  "Starlight",
  "White",
  "Pearl White",
  "Cream",
  "Beige",
  "Sand",
  "Gold",
  "Rose Gold",
  "Rose Pink",
  "Pink",
  "Soft Pink",
  "Coral",
  "Red",
  "Product Red",
  "Burgundy",
  "Maroon",
  "Orange",
  "Sunset Orange",
  "Yellow",
  "Lime",
  "Green",
  "Mint",
  "Mint Green",
  "Sage Green",
  "Alpine Green",
  "Emerald",
  "Teal",
  "Aqua",
  "Blue",
  "Deep Blue",
  "Pacific Blue",
  "Sierra Blue",
  "Ocean Blue",
  "Ice Blue",
  "Denim",
  "Navy",
  "Sky Blue",
  "Ultramarine",
  "Purple",
  "Deep Purple",
  "Lavender",
  "Violet",
  "Lilac",
  "Grape",
  "Titanium",
  "Natural Titanium",
  "Blue Titanium",
  "White Titanium",
  "Black Titanium",
  "Desert Titanium",
  "Titanium Grey",
  "Brown",
  "Tan",
  "Walnut",
  "Silver Blue",
  "Aura Glow",
  "Aura White",
  "Aura Pink",
  "Glacier",
  "Sandstone",
  "Matte Black",
  "Matte White",
  "Carbon",
  "Awesome Black",
  "Force Black",
  "Galactic Silver",
  "Multi",
  "Other",
];

function colorId(name: string) {
  return `color-${name.toLowerCase().replace(/\s+/g, "-")}`;
}

export async function seedColors() {
  const created = [];
  let sortOrder = 0;
  for (const name of DEFAULT_COLORS) {
    const id = colorId(name);
    const existing = await prisma.color.findUnique({ where: { id } });
    if (existing) {
      await prisma.color.update({ where: { id }, data: { name, active: true } });
      continue;
    }
    created.push(
      await prisma.color.create({
        data: { id, name, sortOrder: sortOrder++, active: true },
      }),
    );
  }
  return created;
}