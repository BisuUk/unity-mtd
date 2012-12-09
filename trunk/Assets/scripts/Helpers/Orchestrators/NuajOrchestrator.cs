using System;
using UnityEngine;

using Nuaj;

/// <summary>
/// This script needs to be attached to a GameObject
/// This is the orchestrator that is responsible for trigerring weather changes.
/// It tries to setup the different actors in Nuaj' (2D & 3D clouds, fog, sky) so they look like a preset weather type.
/// 
/// This orchestrator is NOT exhaustive but only serves as a model for you to understand which parameters to tweak to setup the weather you like.
/// Of course, you're free to experiment with parameters and add your own presets.
/// 
/// The idea here is that you have 2 sliders :
/// * The first one lets you interpolate between two presets : a SOURCE and a TARGET preset
/// * The second one lets you interpolate between the preset and a clear sky
/// 
/// Using the first slider you can therefore go from a misty weather to a storm for example.
/// using the second slide, you can go from a totally clear sky down to a full storm.

/// </summary>
/// <remarks>This orchestrator works with the sky, the fog layer, a single 2D cloud layer and a single 3D cloud layer for simplicity.
/// It doesn't create the layers for you so you need to create them yourself so the orchestrator can access them.
/// Also notice the presets were created using the DEFAULT PRESET noise textures for the 2D cloud layer.
/// </remarks>
[ExecuteInEditMode]
public class	NuajOrchestrator : MonoBehaviour
{
	#region CONSTANTS

	protected const float	DEFAULT_RAYLEIGH_DENSITY = ModulePerspective.DEFAULT_RAYLEIGH_DENSITY * 1e5f;
	protected const float	DEFAULT_MIE_DENSITY = ModulePerspective.DEFAULT_MIE_DENSITY * 1e4f;

	#endregion

	#region NESTED TYPES

	public enum		WEATHER_PRESETS
	{
		CLEAR,					// Clear blue sky
		MISTY,					// Slightly foggy
		THICK_FOG,				// Thick fog
		VALLEY_MIST,			// Low dense fog that hides the terrain
		CLOUDY,					// Cloudy but no rain
		HIGH_ALTITUDE_CLOUDS,	// High altitude wispy cirrus clouds
		SUMMER_CLOUDS,			// Cute little cumulus clouds
		SNOWY,					// Thick layer of low altitude grey clouds
		LIGHT_RAIN,				// Dark clouds with a little rain
		STORMY,					// Storm is coming
		STORM,					// Violent storm
	}

	protected struct	SkyValues
	{
		public float	AirDensity, FogDensity;

		/// <summary>
		/// Lerps between 2 sky values
		/// </summary>
		/// <param name="a"></param>
		/// <param name="b"></param>
		/// <param name="_Target"></param>
		/// <param name="t"></param>
		public static void		Lerp( ref SkyValues a, ref SkyValues b, ref SkyValues _Target, float t )
		{
			_Target.AirDensity = NuajOrchestrator.Lerp( a.AirDensity, b.AirDensity, t );
			_Target.FogDensity = NuajOrchestrator.Lerp( a.FogDensity, b.FogDensity, t );
		}

		/// <summary>
		/// Applies the sky values
		/// </summary>
		/// <param name="_Owner"></param>
		/// <param name="_Sky"></param>
		public void		Apply( NuajOrchestrator _Owner, ModulePerspective _Sky )
		{
			_Owner.m_AirDensity = 1e-5f * AirDensity;
			_Owner.m_FogDensity = 1e-4f * FogDensity;

			_Sky.DensityRayleigh = _Owner.m_CurrentMultiplier * _Owner.m_AirDensity;
			_Sky.DensityMie = _Owner.m_CurrentMultiplier * _Owner.m_FogDensity;
		}
	}

	protected struct	FogValues
	{
		public bool	Enabled;
		public float	Altitude, Thickness;
		public float	MieFactor, MieBottomRatio;
		public float	MaxDistance;
		public float	AmbientFactor;
		public float	StepSize;
		public float	NoiseTilingX, NoiseTilingY;
		public float	NoiseAmplitude, NoiseOffset;
		public float	DownpourStrength;

		/// <summary>
		/// Lerps between 2 fog values
		/// </summary>
		/// <param name="a"></param>
		/// <param name="b"></param>
		/// <param name="_Target"></param>
		/// <param name="t"></param>
		public static void		Lerp( ref FogValues a, ref FogValues b, ref FogValues _Target, float t )
		{
			_Target.Enabled=a.Enabled || b.Enabled;
			if ( a.Enabled && !b.Enabled )
			{
				_Target.Altitude=a.Altitude;
				_Target.Thickness=a.Thickness;
				_Target.MieFactor = NuajOrchestrator.Lerp( a.MieFactor, 0.0f, t );
				_Target.MieBottomRatio = a.MieBottomRatio;
				_Target.MaxDistance = a.MaxDistance;
				_Target.AmbientFactor = a.AmbientFactor;
				_Target.StepSize = a.StepSize;
				_Target.NoiseTilingX=a.NoiseTilingX;
				_Target.NoiseTilingY=a.NoiseTilingY;
				_Target.NoiseAmplitude=a.NoiseAmplitude;
				_Target.NoiseOffset=a.NoiseOffset;
				_Target.DownpourStrength = a.DownpourStrength;
			}
			else if ( !a.Enabled && b.Enabled )
			{
				_Target.Altitude=b.Altitude;
				_Target.Thickness=b.Thickness;
				_Target.MieFactor = NuajOrchestrator.Lerp( 0.0f, b.MieFactor, t );
				_Target.MieBottomRatio = b.MieBottomRatio;
				_Target.MaxDistance = b.MaxDistance;
				_Target.AmbientFactor = b.AmbientFactor;
				_Target.StepSize = b.StepSize;
				_Target.NoiseTilingX=b.NoiseTilingX;
				_Target.NoiseTilingY=b.NoiseTilingY;
				_Target.NoiseAmplitude=b.NoiseAmplitude;
				_Target.NoiseOffset=b.NoiseOffset;
				_Target.DownpourStrength = b.DownpourStrength;
			}
			else
			{
				_Target.Altitude=NuajOrchestrator.Lerp( a.Altitude, b.Altitude, t );
				_Target.Thickness=NuajOrchestrator.Lerp( a.Thickness, b.Thickness, t );
				_Target.MieFactor = NuajOrchestrator.Lerp( a.MieFactor, b.MieFactor, t );
				_Target.MieBottomRatio = NuajOrchestrator.Lerp( a.MieBottomRatio, b.MieBottomRatio, t );
				_Target.MaxDistance = NuajOrchestrator.Lerp( a.MaxDistance, b.MaxDistance, t );
				_Target.AmbientFactor = NuajOrchestrator.Lerp( a.AmbientFactor, b.AmbientFactor, t );
				_Target.StepSize = NuajOrchestrator.Lerp( a.StepSize, b.StepSize, t );
				_Target.NoiseTilingX=NuajOrchestrator.Lerp( a.NoiseTilingX, b.NoiseTilingX, t );
				_Target.NoiseTilingY=NuajOrchestrator.Lerp( a.NoiseTilingY, b.NoiseTilingY, t );
				_Target.NoiseAmplitude=NuajOrchestrator.Lerp( a.NoiseAmplitude, b.NoiseAmplitude, t );
				_Target.NoiseOffset=NuajOrchestrator.Lerp( a.NoiseOffset, b.NoiseOffset, t );
				_Target.DownpourStrength = NuajOrchestrator.Lerp( a.DownpourStrength, b.DownpourStrength, t );
			}
		}

		/// <summary>
		/// Applies the fog values
		/// </summary>
		/// <param name="_Owner"></param>
		/// <param name="_Fog"></param>
		public void		Apply( NuajOrchestrator _Owner, ModulePerspective.FogLayer _Fog )
		{
			if ( !(_Fog.Enabled=Enabled) )
				return;

			_Fog.Altitude = Altitude;
			_Fog.Thickness = Thickness;
			_Fog.MieDensityFactor = MieFactor;
			_Fog.DensityRatioBottom = MieBottomRatio;
			_Fog.MaxDistance = MaxDistance;
			_Fog.IsotropicSkyFactor = AmbientFactor;
			_Fog.StepSize = StepSize;
			_Fog.NoiseTilingHorizontal = NoiseTilingX;
			_Fog.NoiseTilingVertical = NoiseTilingY;
			_Fog.NoiseAmplitude = NoiseAmplitude;
			_Fog.NoiseOffset = NoiseOffset;
			_Fog.DownpourStrength = DownpourStrength;

			// Setup wind
			_Fog.WindDirectionAngle = _Owner.m_WindDirectionAngle;
			_Fog.WindForce = _Owner.ComputeWindForce( _Fog.Altitude );
		}
	}

	protected struct	Cloud2DValues
	{
		public bool	Enabled;
		public float	Altitude, Thickness;
		public float	Coverage, Density;
		public float	NoiseTiling;
		public float	NoiseAmplitude, NoiseFrequency;

		/// <summary>
		/// Lerps between 2 cloud values
		/// </summary>
		/// <param name="a"></param>
		/// <param name="b"></param>
		/// <param name="_Target"></param>
		/// <param name="t"></param>
		public static void		Lerp( ref Cloud2DValues a, ref Cloud2DValues b, ref Cloud2DValues _Target, float t )
		{
			_Target.Enabled=a.Enabled || b.Enabled;
			if ( a.Enabled && !b.Enabled )
			{
				_Target.Altitude=a.Altitude;
				_Target.Thickness=a.Thickness;
				_Target.Density=NuajOrchestrator.Lerp( a.Density, 0.0f, t );
				_Target.Coverage=a.Coverage;
				_Target.NoiseTiling=a.NoiseTiling;
				_Target.NoiseAmplitude=a.NoiseAmplitude;
				_Target.NoiseFrequency=a.NoiseFrequency;
			}
			else if ( !a.Enabled && b.Enabled )
			{
				_Target.Altitude=b.Altitude;
				_Target.Thickness=b.Thickness;
				_Target.Density=NuajOrchestrator.Lerp( 0.0f, b.Density, t );
				_Target.Coverage=b.Coverage;
				_Target.NoiseTiling=b.NoiseTiling;
				_Target.NoiseAmplitude=b.NoiseAmplitude;
				_Target.NoiseFrequency=b.NoiseFrequency;
			}
			else
			{
				_Target.Altitude=NuajOrchestrator.Lerp( a.Altitude, b.Altitude, t );
				_Target.Thickness=NuajOrchestrator.Lerp( a.Thickness, b.Thickness, t );
				_Target.Coverage=NuajOrchestrator.Lerp( a.Coverage, b.Coverage, t );
				_Target.Density=NuajOrchestrator.Lerp( a.Density, b.Density, t );
				_Target.NoiseTiling=NuajOrchestrator.Lerp( a.NoiseTiling, b.NoiseTiling, t );
				_Target.NoiseAmplitude=NuajOrchestrator.Lerp( a.NoiseAmplitude, b.NoiseAmplitude, t );
				_Target.NoiseFrequency=NuajOrchestrator.Lerp( a.NoiseFrequency, b.NoiseFrequency, t );
			}
		}

		/// <summary>
		/// Applies the cloud values
		/// </summary>
		/// <param name="_Owner"></param>
		/// <param name="_Cloud"></param>
		/// <param name="_Values"></param>
		/// <param name="_WeatherBalance"></param>
		public void		Apply( NuajOrchestrator _Owner, ModuleCloudLayer.CloudLayer _Cloud )
		{
			if ( !(_Cloud.Enabled=Enabled) )
				return;

			_Cloud.Altitude = Altitude;
			_Cloud.Thickness = Thickness;
			_Cloud.Coverage = Coverage;
			_Cloud.Density = 0.02f * Density;
			_Cloud.NoiseTiling = 0.006f * NoiseTiling;
			_Cloud.AmplitudeFactor = NoiseAmplitude;
			_Cloud.FrequencyFactor = NoiseFrequency;

			// Setup wind
			_Cloud.WindDirectionAngle = _Owner.m_WindDirectionAngle;
			_Cloud.WindForce = _Owner.ComputeWindForce( _Cloud.Altitude );
		}
	}

	protected struct	Cloud3DValues
	{
		public bool	Enabled;
		public float	Altitude, Thickness;
		public float	Coverage, Density;
		public float	NoiseTiling;
		public float	NoiseAmplitude, NoiseFrequency;

		/// <summary>
		/// Lerps between 2 cloud values
		/// </summary>
		/// <param name="a"></param>
		/// <param name="b"></param>
		/// <param name="_Target"></param>
		/// <param name="t"></param>
		public static void		Lerp( ref Cloud3DValues a, ref Cloud3DValues b, ref Cloud3DValues _Target, float t )
		{
			_Target.Enabled=a.Enabled || b.Enabled;
			if ( a.Enabled && !b.Enabled )
			{
				_Target.Altitude=a.Altitude;
				_Target.Thickness=NuajOrchestrator.Lerp( a.Thickness, 0.1f * a.Thickness, t );
				_Target.Density=NuajOrchestrator.Lerp( a.Density, 0.0f, t );
				_Target.Coverage=a.Coverage;
				_Target.NoiseTiling=a.NoiseTiling;
				_Target.NoiseAmplitude=a.NoiseAmplitude;
				_Target.NoiseFrequency=a.NoiseFrequency;
			}
			else if ( !a.Enabled && b.Enabled )
			{
				_Target.Altitude=b.Altitude;
				_Target.Thickness=NuajOrchestrator.Lerp( 0.1f * b.Thickness, b.Thickness, t );
				_Target.Density=NuajOrchestrator.Lerp( 0.0f, b.Density, t );
				_Target.Coverage=b.Coverage;
				_Target.NoiseTiling=b.NoiseTiling;
				_Target.NoiseAmplitude=b.NoiseAmplitude;
				_Target.NoiseFrequency=b.NoiseFrequency;
			}
			else
			{
				_Target.Altitude=NuajOrchestrator.Lerp( a.Altitude, b.Altitude, t );
				_Target.Thickness=NuajOrchestrator.Lerp( a.Thickness, b.Thickness, t );
				_Target.Coverage=NuajOrchestrator.Lerp( a.Coverage, b.Coverage, t );
				_Target.Density=NuajOrchestrator.Lerp( a.Density, b.Density, t );
				_Target.NoiseTiling=NuajOrchestrator.Lerp( a.NoiseTiling, b.NoiseTiling, t );
				_Target.NoiseAmplitude=NuajOrchestrator.Lerp( a.NoiseAmplitude, b.NoiseAmplitude, t );
				_Target.NoiseFrequency=NuajOrchestrator.Lerp( a.NoiseFrequency, b.NoiseFrequency, t );
			}
		}

		/// <summary>
		/// Applies the cloud values
		/// </summary>
		/// <param name="_Owner"></param>
		/// <param name="_Cloud"></param>
		/// <param name="_Values"></param>
		/// <param name="_WeatherBalance"></param>
		public void		Apply( NuajOrchestrator _Owner, ModuleCloudVolume.CloudLayer _Cloud )
		{
			if ( !(_Cloud.Enabled=Enabled) )
				return;

			_Cloud.Altitude = Altitude;
			_Cloud.Thickness = Thickness;
			_Cloud.Coverage = Coverage;
			_Cloud.Density = 5.0e-3f * Density;
			_Cloud.NoiseTiling = 0.02f * NoiseTiling;
			_Cloud.AmplitudeFactor = NoiseAmplitude;
			_Cloud.FrequencyFactor = NoiseFrequency;

			// Setup wind
			_Cloud.WindDirectionAngle = _Owner.m_WindDirectionAngle;
			_Cloud.WindForce = _Owner.ComputeWindForce( _Cloud.Altitude );
		}
	}

	#endregion

	#region FIELDS

	// Time of Day
	[SerializeField] protected float			m_DensityMultiplierAtNight = 1.5f;	// Let's have a nice Sunset

	[SerializeField] protected float			m_TimeOfDay = 12.0f;	// Noon
	[SerializeField] protected int				m_Month = 6;			// June
	[SerializeField] protected int				m_Day = 21;				// the 21st

	[SerializeField] protected float			m_Latitude = 45.0f;		// Lyon, France
	[SerializeField] protected float			m_Longitude = 0.0f;

	// Weather change
	[SerializeField] protected WEATHER_PRESETS	m_WeatherTypeSource = WEATHER_PRESETS.CLEAR;
	[SerializeField] protected WEATHER_PRESETS	m_WeatherTypeTarget = WEATHER_PRESETS.CLOUDY;
	[SerializeField] protected float			m_WeatherBalance = 0.0f;
	[SerializeField] protected float			m_WindForce = 0.0f;
	[SerializeField] protected float			m_WindDirectionAngle = 0.0f;

	#region Presets

	#region Sky

	protected static SkyValues[]	ms_PresetsSky = new SkyValues[]
	{
		// CLEAR
		new SkyValues() { AirDensity=DEFAULT_RAYLEIGH_DENSITY, FogDensity=DEFAULT_MIE_DENSITY },
		// MISTY
		new SkyValues() { AirDensity=12.4f, FogDensity=177.0f },
		// THICK_FOG
		new SkyValues() { AirDensity=DEFAULT_RAYLEIGH_DENSITY, FogDensity=180.0f },
		// VALLEY_MIST
		new SkyValues() { AirDensity=DEFAULT_RAYLEIGH_DENSITY, FogDensity=24.0f },
		// CLOUDY
		new SkyValues() { AirDensity=19.0f, FogDensity=50.0f },
		// HIGH_ALTITUDE_CLOUDS
		new SkyValues() { AirDensity=DEFAULT_RAYLEIGH_DENSITY, FogDensity=DEFAULT_MIE_DENSITY },
		// SUMMER_CLOUDS
		new SkyValues() { AirDensity=DEFAULT_RAYLEIGH_DENSITY, FogDensity=DEFAULT_MIE_DENSITY },
		// SNOWY
		new SkyValues() { AirDensity=32.0f, FogDensity=270.0f },
		// LIGHT_RAIN
		new SkyValues() { AirDensity=15.0f, FogDensity=77.0f },
		// STORMY
		new SkyValues() { AirDensity=18.0f, FogDensity=152.0f },
		// STORM
		new SkyValues() { AirDensity=20.0f, FogDensity=152.0f },
	};

	#endregion

	#region Fog

	protected static FogValues[]	ms_PresetsFog = new FogValues[]
	{
		// CLEAR
		new FogValues() { Enabled=false },
		// MISTY
		new FogValues() { Enabled=true, Altitude=0.0f, Thickness=2.0f, MieFactor=0.12f, MieBottomRatio=0.48f, MaxDistance=3.25f, AmbientFactor=3.0f, StepSize=1.0f, NoiseTilingX=0.05f, NoiseTilingY=0.05f, NoiseAmplitude=0.5f, NoiseOffset=0.0f, DownpourStrength=0.0f },
		// THICK_FOG
		new FogValues() { Enabled=true, Altitude=0.0f, Thickness=2.0f, MieFactor=1.0f, MieBottomRatio=0.48f, MaxDistance=3.25f, AmbientFactor=1.84f, StepSize=1.0f, NoiseTilingX=0.05f, NoiseTilingY=0.05f, NoiseAmplitude=0.5f, NoiseOffset=0.0f, DownpourStrength=0.0f },
		// VALLEY_MIST
		new FogValues() { Enabled=true, Altitude=-0.1f, Thickness=1.6f, MieFactor=2.4f, MieBottomRatio=10.0f, MaxDistance=20.0f, AmbientFactor=3.0f, StepSize=0.4f, NoiseTilingX=1.0f, NoiseTilingY=1.0f, NoiseAmplitude=0.75f, NoiseOffset=0.8f, DownpourStrength=-0.1f },
		// CLOUDY
		new FogValues() { Enabled=false },
		// HIGH_ALTITUDE_CLOUDS
		new FogValues() { Enabled=false },
		// SUMMER_CLOUDS
		new FogValues() { Enabled=false },
		// SNOWY
		new FogValues() { Enabled=true, Altitude=0.0f, Thickness=3.8f, MieFactor=0.073f, MieBottomRatio=0.39f, MaxDistance=16.0f, AmbientFactor=1.0f, StepSize=1.0f, NoiseTilingX=0.05f, NoiseTilingY=0.05f, NoiseAmplitude=0.5f, NoiseOffset=0.0f, DownpourStrength=0.0f },
		// LIGHT_RAIN
		new FogValues() { Enabled=true, Altitude=0.0f, Thickness=3.8f, MieFactor=1.0f, MieBottomRatio=0.36f, MaxDistance=12.0f, AmbientFactor=0.39f, StepSize=0.2f, NoiseTilingX=3.5f, NoiseTilingY=0.125f, NoiseAmplitude=0.3f, NoiseOffset=-0.95f, DownpourStrength=1.0f },
		// STORMY
		new FogValues() { Enabled=true, Altitude=0.0f, Thickness=3.8f, MieFactor=0.46f, MieBottomRatio=0.26f, MaxDistance=12.0f, AmbientFactor=1.0f, StepSize=0.2f, NoiseTilingX=3.5f, NoiseTilingY=0.125f, NoiseAmplitude=0.0f, NoiseOffset=-0.95f, DownpourStrength=2.0f },
		// STORM
		new FogValues() { Enabled=true, Altitude=0.0f, Thickness=4.0f, MieFactor=0.72f, MieBottomRatio=0.12f, MaxDistance=20.0f, AmbientFactor=3.0f, StepSize=0.2f, NoiseTilingX=3.5f, NoiseTilingY=0.125f, NoiseAmplitude=0.75f, NoiseOffset=-0.95f, DownpourStrength=3.0f },
	};

	#endregion

	#region 2D Cloud

	protected static Cloud2DValues[]	ms_PresetsCloud2D = new Cloud2DValues[]
	{
		// CLEAR
		new Cloud2DValues() { Enabled=false },
		// MISTY
		new Cloud2DValues() { Enabled=false },
		// THICK_FOG
		new Cloud2DValues() { Enabled=true, Altitude=8.0f, Thickness=0.15f, Coverage=0.28f, Density=0.045f, NoiseTiling=1.36f, NoiseFrequency=2.31f, NoiseAmplitude=0.5f },
		// VALLEY_MIST
		new Cloud2DValues() { Enabled=true, Altitude=12.0f, Thickness=0.18f, Coverage=0.0f, Density=0.041f, NoiseTiling=0.776f, NoiseFrequency=2.31f, NoiseAmplitude=0.5f },
		// CLOUDY
		new Cloud2DValues() { Enabled=true, Altitude=12.0f, Thickness=0.15f, Coverage=0.0f, Density=0.08f, NoiseTiling=0.776f, NoiseFrequency=2.31f, NoiseAmplitude=0.5f },
		// HIGH_ALTITUDE_CLOUDS
		new Cloud2DValues() { Enabled=true, Altitude=12.0f, Thickness=0.15f, Coverage=0.14f, Density=0.013f, NoiseTiling=1.36f, NoiseFrequency=2.31f, NoiseAmplitude=0.5f },
		// SUMMER_CLOUDS
		new Cloud2DValues() { Enabled=true, Altitude=12.0f, Thickness=0.15f, Coverage=-0.03f, Density=0.013f, NoiseTiling=1.36f, NoiseFrequency=2.31f, NoiseAmplitude=0.5f },
		// SNOWY
		new Cloud2DValues() { Enabled=true, Altitude=12.0f, Thickness=0.15f, Coverage=0.31f, Density=0.073f, NoiseTiling=1.36f, NoiseFrequency=2.31f, NoiseAmplitude=0.5f },
		// LIGHT_RAIN
		new Cloud2DValues() { Enabled=true, Altitude=12.0f, Thickness=0.15f, Coverage=0.36f, Density=0.02f, NoiseTiling=1.36f, NoiseFrequency=2.31f, NoiseAmplitude=0.5f },
		// STORMY
		new Cloud2DValues() { Enabled=true, Altitude=12.0f, Thickness=0.18f, Coverage=0.36f, Density=0.054f, NoiseTiling=1.36f, NoiseFrequency=2.31f, NoiseAmplitude=0.5f },
		// STORM
		new Cloud2DValues() { Enabled=true, Altitude=12.0f, Thickness=0.18f, Coverage=0.17f, Density=0.049f, NoiseTiling=1.36f, NoiseFrequency=2.31f, NoiseAmplitude=0.5f },
	};

	#endregion

	#region 3D Cloud

	protected static Cloud3DValues[]	ms_PresetsCloud3D = new Cloud3DValues[]
	{
		// CLEAR
		new Cloud3DValues() { Enabled=false },
		// MISTY
		new Cloud3DValues() { Enabled=false },
		// THICK_FOG
		new Cloud3DValues() { Enabled=false },
		// VALLEY_MIST
		new Cloud3DValues() { Enabled=true, Altitude=5.3f, Thickness=3.55f, Coverage=-0.29f, Density=0.075f, NoiseTiling=0.345f, NoiseFrequency=3.0f, NoiseAmplitude=0.4f },
		// CLOUDY
		new Cloud3DValues() { Enabled=true, Altitude=5.3f, Thickness=1.9f, Coverage=-0.11f, Density=0.25f, NoiseTiling=0.66f, NoiseFrequency=3.0f, NoiseAmplitude=0.61f },
		// HIGH_ALTITUDE_CLOUDS
		new Cloud3DValues() { Enabled=false },
		// SUMMER_CLOUDS
		new Cloud3DValues() { Enabled=true, Altitude=4.0f, Thickness=1.0f, Coverage=-0.28f, Density=0.05f, NoiseTiling=0.7273367f, NoiseFrequency=2.758f, NoiseAmplitude=0.61f },
		// SNOWY
		new Cloud3DValues() { Enabled=true, Altitude=4.0f, Thickness=0.65f, Coverage=0.17f, Density=0.108f, NoiseTiling=2.26f, NoiseFrequency=3.0f, NoiseAmplitude=0.61f },
		// LIGHT_RAIN
		new Cloud3DValues() { Enabled=true, Altitude=4.0f, Thickness=0.75f, Coverage=0.011f, Density=0.21f, NoiseTiling=1.32f, NoiseFrequency=3.0f, NoiseAmplitude=0.61f },
		// STORMY
		new Cloud3DValues() { Enabled=true, Altitude=4.0f, Thickness=2.0f, Coverage=-0.16f, Density=0.13f, NoiseTiling=0.567f, NoiseFrequency=3.0f, NoiseAmplitude=0.61f },
		// STORM
		new Cloud3DValues() { Enabled=true, Altitude=4.0f, Thickness=2.5f, Coverage=0.059f, Density=0.18f, NoiseTiling=0.567f, NoiseFrequency=3.0f, NoiseAmplitude=0.61f },
	};

	#endregion

	#endregion

	// Internal cached data
	protected NuajManager	m_Manager = null;
	protected int			m_DayOfYear = 0;
	protected float			m_HourOfDay = 0.0f;
	protected float			m_CurrentMultiplier = 1.0f;	// The density multiplier at current time
	protected float			m_AirDensity=Nuaj.ModulePerspective.DEFAULT_RAYLEIGH_DENSITY;
	protected float			m_FogDensity=Nuaj.ModulePerspective.DEFAULT_MIE_DENSITY;

	#endregion

	#region PROPERTIES

	/// <summary>
	/// Gets or sets the factor to apply to RGBA map values
	/// </summary>
	protected NuajManager	Manager
	{
		get
		{
			if ( m_Manager != null )
				return m_Manager;

			m_Manager = FindObjectOfType( typeof(NuajManager) ) as NuajManager;
			return m_Manager;
		}
	}

	#region Time & Date

	/// <summary>
	/// Gets or sets the density factor at night that helps to create big red sunsets
	/// </summary>
	public float		DensityMultiplierAtNight
	{
		get { return m_DensityMultiplierAtNight; }
		set
		{
			if ( Mathf.Approximately( value, m_DensityMultiplierAtNight ) )
				return;

			m_DensityMultiplierAtNight = value;
			UpdateTime();
		}
	}

	/// <summary>
	/// Gets or sets the time of day in [0,24]
	/// </summary>
	public float		TimeOfDay
	{
		get { return m_TimeOfDay; }
		set
		{
			if ( Mathf.Approximately( value, m_TimeOfDay ) )
				return;

			m_TimeOfDay = value;
			UpdateTime();
		}
	}

	/// <summary>
	/// Gets or sets the normalized time (0 is midnight, 0.5 is noon)
	/// </summary>
	public float		NormalizedTime
	{
		get { return m_TimeOfDay / 24.0f; }
		set
		{
			if ( Mathf.Approximately( value, NormalizedTime ) )
				return;

			m_TimeOfDay = value * 24.0f;
			UpdateTime();
		}
	}

	/// <summary>
	/// Gets or sets the day of the month
	/// </summary>
	public int			Day
	{
		get { return m_Day; }
		set
		{
			if ( value == m_Day )
				return;

			m_Day = value;
			UpdateTime();
		}
	}

	/// <summary>
	/// Gets or sets the month of the year
	/// </summary>
	public int			Month
	{
		get { return m_Month; }
		set
		{
			if ( value == m_Month )
				return;

			m_Month = value;
			UpdateTime();
		}
	}

	/// <summary>
	/// Gets or sets the day of the year [0,365]
	/// </summary>
	public int			DayOfYear
	{
		get { return m_DayOfYear; }
		set
		{
			if ( value == m_DayOfYear )
				return;

			m_DayOfYear = value;
			DateTime	NewDate = new DateTime( 2011, 1, 1 ) + TimeSpan.FromDays( m_DayOfYear );
			m_Day = NewDate.Day;
			m_Month = NewDate.Month;
			UpdateTime();
		}
	}

	/// <summary>
	/// Gets or sets the latitude of the viewer (in [-90,+90])
	/// </summary>
	public float		Latitude
	{
		get { return m_Latitude; }
		set
		{
			if ( Mathf.Approximately( value, m_Latitude ) )
				return;

			m_Latitude = value;
			UpdateTime();
		}
	}

	/// <summary>
	/// Gets or sets the longitude of the viewer (in [0,360])
	/// </summary>
	public float		Longitude
	{
		get { return m_Longitude; }
		set
		{
			if ( Mathf.Approximately( value, m_Longitude ) )
				return;

		
			m_Longitude = value;
			UpdateTime();
		}
	}

	#endregion

	#region Weather Control

	/// <summary>
	/// Gets or sets the source weather preset to simulate
	/// </summary>
	public WEATHER_PRESETS	WeatherTypeSource
	{
		get { return m_WeatherTypeSource; }
		set
		{
			if ( value == m_WeatherTypeSource )
				return;

			m_WeatherTypeSource = value;
			UpdatePreset();
		}
	}

	/// <summary>
	/// Gets or sets the target weather preset to simulate
	/// </summary>
	public WEATHER_PRESETS	WeatherTypeTarget
	{
		get { return m_WeatherTypeTarget; }
		set
		{
			if ( value == m_WeatherTypeTarget )
				return;

			m_WeatherTypeTarget = value;
			UpdatePreset();
		}
	}

	/// <summary>
	/// Gets or sets the weather balance factor in [0,1]
	/// A balance of 0 is uses values from the SOURCE preset while a balance of 1 uses values from the TARGET preset
	/// </summary>
	public float		WeatherBalance
	{
		get { return m_WeatherBalance; }
		set
		{
			if ( Mathf.Approximately( value, m_WeatherBalance ) )
				return;

			m_WeatherBalance = value;
			UpdatePreset();
		}
	}

	/// <summary>
	/// Gets or sets the wind force
	/// </summary>
	public float		WindForce
	{
		get { return m_WindForce; }
		set
		{
			if ( Mathf.Approximately( value, m_WindForce ) )
				return;

			m_WindForce = value;
			UpdateWeather();
		}
	}

	/// <summary>
	/// Gets or sets the wind direction angle
	/// </summary>
	public float		WindDirectionAngle
	{
		get { return m_WindDirectionAngle; }
		set
		{
			if ( Mathf.Approximately( value, m_WindDirectionAngle ) )
				return;

			m_WindDirectionAngle = value;
			UpdateWeather();
		}
	}

	/// <summary>
	/// Gets the current air density for the sky
	/// </summary>
	public float		AirDensity	{ get { return m_AirDensity; } }

	/// <summary>
	/// Gets the current fog density for the sky
	/// </summary>
	public float		FogDensity	{ get { return m_FogDensity; } }

	#endregion

	#endregion

	#region METHODS

	void		OnEnable()
	{
		UpdateTime();
		UpdatePreset();
	}

	/// <summary>
	/// Updates the Sun's position
	/// </summary>
	protected void	UpdateTime()
	{
		if ( !enabled || Manager == null )
			return;

		// Cache data
		int			Day = Math.Min( m_Day, DateTime.DaysInMonth( 2011, m_Month ) );
		DateTime	NewDate = new DateTime( 2011, m_Month, Day ) + TimeSpan.FromHours( TimeOfDay );
		m_DayOfYear = NewDate.DayOfYear;
		m_HourOfDay = NewDate.Hour;

		// Compute Sun's direction
		Vector3	SunDirection = Nuaj.ModuleSatellites.SatelliteStar.ComputeSunPosition( Mathf.Deg2Rad * m_Longitude, Mathf.Deg2Rad * m_Latitude, m_DayOfYear, m_TimeOfDay );
		Manager.SunDirection = SunDirection;

		// Update fog & air density based on night time
		NuajOrchestrator	OrchWeather = GetComponent<NuajOrchestrator>();
		float	DefaultAirDensity = OrchWeather != null ? OrchWeather.AirDensity : Nuaj.ModulePerspective.DEFAULT_RAYLEIGH_DENSITY;
		float	DefaultFogDensity = OrchWeather != null ? OrchWeather.FogDensity : Nuaj.ModulePerspective.DEFAULT_MIE_DENSITY;

		float	DayNight = Mathf.Clamp01( SunDirection.y );
		m_CurrentMultiplier = Mathf.Lerp( m_DensityMultiplierAtNight, 1.0f, DayNight );

		Manager.ModuleSky.DensityRayleigh = m_CurrentMultiplier * DefaultAirDensity;
		Manager.ModuleSky.DensityMie = m_CurrentMultiplier * DefaultFogDensity;
	}

	protected SkyValues		m_CurrentSkyValues = new SkyValues();
	protected FogValues		m_CurrentFogValues = new FogValues();
	protected Cloud2DValues	m_CurrentCloud2DValues = new Cloud2DValues();
	protected Cloud3DValues	m_CurrentCloud3DValues = new Cloud3DValues();

	/// <summary>
	/// Interpolates between source and target presets
	/// </summary>
	protected void	UpdatePreset()
	{
		int	SourcePresetIndex = (int) m_WeatherTypeSource;
		int	TargetPresetIndex = (int) m_WeatherTypeTarget;

		SkyValues.Lerp( ref ms_PresetsSky[SourcePresetIndex], ref ms_PresetsSky[TargetPresetIndex], ref m_CurrentSkyValues, m_WeatherBalance );
		FogValues.Lerp( ref ms_PresetsFog[SourcePresetIndex], ref ms_PresetsFog[TargetPresetIndex], ref m_CurrentFogValues, m_WeatherBalance );
		Cloud2DValues.Lerp( ref ms_PresetsCloud2D[SourcePresetIndex], ref ms_PresetsCloud2D[TargetPresetIndex], ref m_CurrentCloud2DValues, m_WeatherBalance );
		Cloud3DValues.Lerp( ref ms_PresetsCloud3D[SourcePresetIndex], ref ms_PresetsCloud3D[TargetPresetIndex], ref m_CurrentCloud3DValues, m_WeatherBalance );

		UpdateWeather();
	}

	/// <summary>
	/// Aplies the current preset and a clear weather
	/// </summary>
	protected void	UpdateWeather()
	{
		if ( !enabled || Manager == null )
			return;

		// Retrieve all possible supported actors
		ModulePerspective				Sky = Manager.ModuleSky;
		ModulePerspective.FogLayer		Fog = Sky != null ? Sky.Fog : null;
		ModuleCloudLayer.CloudLayer		Cloud2D = Manager.ModuleCloudLayer.CloudLayersCount > 0 ? Manager.ModuleCloudLayer.CloudLayers[0] as ModuleCloudLayer.CloudLayer : null;
		ModuleCloudVolume.CloudLayer	Cloud3D = Manager.ModuleCloudVolume.CloudLayersCount > 0 ? Manager.ModuleCloudVolume.CloudLayers[0] as ModuleCloudVolume.CloudLayer : null;

		// Apply values
		if ( Sky != null )
			m_CurrentSkyValues.Apply( this, Sky );
		if ( Fog != null )
			m_CurrentFogValues.Apply( this, Fog );
		if ( Cloud2D != null )
			m_CurrentCloud2DValues.Apply( this, Cloud2D );
		if ( Cloud3D != null )
			m_CurrentCloud3DValues.Apply( this, Cloud3D );
	}

	/// <summary>
	/// Computes the wind force based on altitude
	/// For the moment, the wind force is simply twice larger for clouds of high altitudes
	/// </summary>
	/// <param name="_AltitudeKm"></param>
	/// <returns></returns>
	protected float	ComputeWindForce( float _AltitudeKm )
	{
		return Lerp( 1.0f, 2.0f, _AltitudeKm / 12.0f ) * m_WindForce;
	}

	protected static float	Lerp( float a, float b, float t )
	{
		return a + (b-a) * t;
	}

	#endregion
}
