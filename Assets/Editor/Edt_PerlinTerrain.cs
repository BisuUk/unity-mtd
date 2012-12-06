using UnityEngine;
using UnityEditor;
using LibNoise;
using LibNoise.Modifiers;

public class Edt_PerlinTerrain : EditorWindow {
	static Terrain terrain;
	float frequency = 0.05f;
	System.Enum quality = NoiseQuality.Standard;
	int seed = 0;
	int octaves = 6;
	float lacunarity = 2.0f;
	float persistence = 0.5f;

	[MenuItem ("Aubergine/Terrain/Create Perlin")]
	static void Init() {
		if (!terrain)
			terrain = Selection.activeGameObject.GetComponent<Terrain>();
		if (!terrain)
			terrain = Terrain.activeTerrain;
		EditorWindow.GetWindow(typeof(Edt_PerlinTerrain)).Show();
	}
	
	void OnGUI() {
		if (!terrain) {
            GUILayout.Label("No terrain found");
            if (GUILayout.Button("Cancel")) {
                EditorWindow.GetWindow(typeof(Edt_PerlinTerrain)).Close();
            }
            return;
        }

		quality = EditorGUILayout.EnumPopup("Noise Quality:", quality);
		frequency = EditorGUILayout.FloatField("Frequency:", frequency);
		seed = EditorGUILayout.IntField("Seed:", seed);
		octaves = EditorGUILayout.IntField("OctaveCount:", octaves);
		lacunarity = EditorGUILayout.FloatField("Lacunarity:", lacunarity);
		persistence = EditorGUILayout.FloatField("Persistence:", persistence);

		if (GUILayout.Button("Export FastNoise")) {
			IModule module = new FastNoise();
			((FastNoise)module).Frequency = (double)frequency;
			((FastNoise)module).NoiseQuality = (NoiseQuality)quality;
			((FastNoise)module).Seed = seed;
			((FastNoise)module).OctaveCount = octaves;
			((FastNoise)module).Lacunarity = (double)lacunarity;
			((FastNoise)module).Persistence = (double)persistence;
			//Export
            SetTerrainHeights(module);
			EditorWindow.GetWindow(typeof(Edt_PerlinTerrain)).Close();
        }

		if (GUILayout.Button("Export FastBillow")) {
			IModule module = new FastBillow();
			((FastBillow)module).Frequency = (double)frequency;
			((FastBillow)module).NoiseQuality = (NoiseQuality)quality;
			((FastBillow)module).Seed = seed;
			((FastBillow)module).OctaveCount = octaves;
			((FastBillow)module).Lacunarity = (double)lacunarity;
			((FastBillow)module).Persistence = (double)persistence;
			//Export
            SetTerrainHeights(module);
			EditorWindow.GetWindow(typeof(Edt_PerlinTerrain)).Close();
        }

		if (GUILayout.Button("Export FastRidgedMultifractal")) {
			IModule module = new FastRidgedMultifractal();
			((FastRidgedMultifractal)module).Frequency = (double)frequency;
			((FastRidgedMultifractal)module).NoiseQuality = (NoiseQuality)quality;
			((FastRidgedMultifractal)module).Seed = seed;
			((FastRidgedMultifractal)module).OctaveCount = octaves;
			((FastRidgedMultifractal)module).Lacunarity = (double)lacunarity;
			//Export
            SetTerrainHeights(module);
			EditorWindow.GetWindow(typeof(Edt_PerlinTerrain)).Close();
        }

		if (GUILayout.Button("Export Voronoi")) {
			IModule module = new Voronoi();
			((Voronoi)module).Frequency = (double)frequency;
			//Export
            SetTerrainHeights(module);
			EditorWindow.GetWindow(typeof(Edt_PerlinTerrain)).Close();
        }

		if (GUILayout.Button("Export FastCombined")) {
			FastBillow fastbillow = new FastBillow();
			fastbillow.Frequency = (double)frequency;
			fastbillow.NoiseQuality = (NoiseQuality)quality;
			fastbillow.Seed = seed;
			fastbillow.OctaveCount = octaves;
			fastbillow.Lacunarity = (double)lacunarity;
			fastbillow.Persistence = (double)persistence;
			
			ScaleBiasOutput fastscaledBillow = new ScaleBiasOutput(fastbillow);
			fastscaledBillow.Bias = -0.75;
			fastscaledBillow.Scale = 0.125;
			
			FastRidgedMultifractal fastridged = new FastRidgedMultifractal();
			fastridged.Frequency = (double)(frequency/2.0f);
			fastridged.NoiseQuality = (NoiseQuality)quality;
			fastridged.Seed = seed;
			fastridged.OctaveCount = octaves;
			fastridged.Lacunarity = (double)lacunarity;
			
			FastNoise fastperlin = new FastNoise();
			fastperlin.Frequency = (double)frequency;
			fastperlin.NoiseQuality = (NoiseQuality)quality;
			fastperlin.Seed = seed;
			fastperlin.OctaveCount = octaves;
			fastperlin.Lacunarity = (double)lacunarity;
			fastperlin.Persistence = (double)persistence;
			
			Select fastselector = new Select(fastperlin, fastridged, fastscaledBillow);
			fastselector.SetBounds(0, 1000);
			fastselector.EdgeFalloff = 0.5;
			
			IModule module = fastselector;
			//Export
            SetTerrainHeights(module);
			EditorWindow.GetWindow(typeof(Edt_PerlinTerrain)).Close();
        }

		if (GUILayout.Button("Cancel")) {
			EditorWindow.GetWindow(typeof(Edt_PerlinTerrain)).Close();
		}
	}
	
	void SetTerrainHeights(IModule module) {
		float[,] heights = new float[terrain.terrainData.heightmapWidth, terrain.terrainData.heightmapHeight];
		double value;
		for (int z=0; z < terrain.terrainData.heightmapHeight; z++) {
			for (int x=0; x < terrain.terrainData.heightmapWidth; x++) {
				value = module.GetValue(x, 0, z);
				float intensity = (float)(1 + value) * 0.5f;
				Mathf.Clamp(intensity, 0f, 1f);
				heights[x,z] = intensity;
			}
		}
		terrain.terrainData.SetHeights(0, 0, heights);
	}
}