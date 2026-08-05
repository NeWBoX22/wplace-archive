// scripts/stitch-snapshot.mjs
// Junta os tiles de uma área (baixados pelo archive:world) em uma única imagem PNG.
//
// Uso:
//   node scripts/stitch-snapshot.mjs <pasta-dos-tiles> <start-x> <start-y> <width> <height> <arquivo-de-saida.png>

import sharp from "sharp";
import fs from "fs";
import path from "path";

const [, , tilesDir, startXArg, startYArg, widthArg, heightArg, outFile] = process.argv;

if (!tilesDir || !outFile) {
	console.error(
		"Uso: node stitch-snapshot.mjs <pasta-dos-tiles> <start-x> <start-y> <width> <height> <saida.png>"
	);
	process.exit(1);
}

const TILE_SIZE = 1000; // cada tile do wplace-archive tem 1000x1000px
const startX = parseInt(startXArg, 10);
const startY = parseInt(startYArg, 10);
const width = parseInt(widthArg, 10);
const height = parseInt(heightArg, 10);

// tenta achar o tile tanto em <tilesDir>/{x}/{y}.png quanto em <tilesDir>/11/{x}/{y}.png
function findTile(x, y) {
	const candidates = [
		path.join(tilesDir, String(x), `${y}.png`),
		path.join(tilesDir, "11", String(x), `${y}.png`),
	];
	return candidates.find((p) => fs.existsSync(p)) ?? null;
}

const composites = [];
let missing = 0;

for (let dx = 0; dx < width; dx++) {
	for (let dy = 0; dy < height; dy++) {
		const x = startX + dx;
		const y = startY + dy;
		const tilePath = findTile(x, y);

		if (tilePath) {
			composites.push({ input: tilePath, left: dx * TILE_SIZE, top: dy * TILE_SIZE });
		} else {
			missing++;
			console.warn(`⚠️  tile ausente: x=${x} y=${y}`);
		}
	}
}

if (composites.length === 0) {
	console.error("Nenhum tile encontrado. Confira o caminho de --out do archive:world.");
	process.exit(1);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });

await sharp({
	create: {
		width: width * TILE_SIZE,
		height: height * TILE_SIZE,
		channels: 4,
		background: { r: 0, g: 0, b: 0, alpha: 0 },
	},
})
	.composite(composites)
	.png()
	.toFile(outFile);

console.log(`✅ Snapshot salvo em ${outFile} (${composites.length} tiles, ${missing} faltando)`);
