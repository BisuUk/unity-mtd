using System;
using System.Collections;
using UnityEngine;
using UnityEditor;

using Nuaj;

namespace Nuaj.GUI
{
	/// <summary>
	/// Aerial Perspective editor
	/// </summary>
	public class ModuleEditorPerspective : ModuleEditorBase
	{
		#region CONSTANTS

		protected const float	MAX_RAYLEIGH = 200.0f;
		protected const float	MAX_MIE = 1000.0f;

		#endregion

		#region NESTED TYPES

		protected enum FOG_NOISE_PRESETS
		{
			RAIN,
			MIST_THICK,
			SANDSTORM
		}

		#endregion

		#region FIELDS

		protected ModulePerspective	m_Module = null;

		protected bool				m_bFoldOutFog = true;
		protected bool				m_bFoldOutAppearance = true;
		protected bool				m_bFoldOutNoise = true;
		protected bool				m_bFoldOutAnimation = false;

		protected bool				m_bFoldOutRendering = false;

		#endregion

		#region PROPERTIES

		public override GUIContent TabCaption
		{
			get { return new GUIContent( "Sky", "Edits the configuration for the sky and aerial perspective module" ); }
		}

		protected override string ModuleInfos
		{
			get { return	"Sky & Aerial Perspective Module\n" +
							"This module controls the effect of air and fog in the distance\n" +
							"typical to large objects like a terrain or a huge cloud.\n"; }
		}

		protected override string HelpURL
		{
			get { return "sky-module"; }
		}

		#endregion

		#region METHODS

		public ModuleEditorPerspective( ModulePerspective _Module ) : base( _Module )
		{
			m_Module = _Module;
		}

		public override bool	OnInspectorGUISimple()
		{
			if ( !base.OnInspectorGUISimple() )
				return false;

			return true;
		}

		public override bool	OnInspectorGUIAdvanced()
		{
			if ( !base.OnInspectorGUIAdvanced() )
				return false;

			m_Module.SkyModel = (Nuaj.ModulePerspective.SKY_MODEL) GUIHelpers.ComboBox( new GUIContent( "Sky Model", "Sets the sky model to use for rendering.\n . The simple model is faster but less accurate and has no godrays and you can't fly into space with it.\n . The complex model (default) is slower but more accurate and has godrays and you can fly to outer space.\n . The empty model can be useful if rendering clouds in outer space with no surrounding atmosphere, to simulate a nebula or a galaxy for example" ), m_Module.SkyModel, "Change Sky Model" );

			if ( m_Module.SkyModel != ModulePerspective.SKY_MODEL.NONE )
			{
				GUIHelpers.Separate();
				m_Module.DensityRayleigh = 1e-5f * GUIHelpers.Slider( new GUIContent( "Density Rayleigh", "Changes the density of air molecules (~sky color)" ), 1e5f * m_Module.DensityRayleigh, 0.0f, MAX_RAYLEIGH, "Change Rayleigh Density" );
				m_Module.DensityMie = 1e-4f * GUIHelpers.Slider( new GUIContent( "Density Mie", "Changes the density of aerosol particles (~fog amount)" ), 1e4f * m_Module.DensityMie, 0.0f, MAX_MIE, "Change Mie Density" );
				m_Module.ScatteringAnisotropy = GUIHelpers.Slider( new GUIContent( "Scattering Anisotropy", "Changes the preferred direction of light bounce on particles" ), m_Module.ScatteringAnisotropy, -0.99f, 0.99f, "Change Scattering Anisotropy" );
				m_Module.PlanetRadiusOffsetKm = GUIHelpers.Slider( new GUIContent( "Horizon Offset", "Changes the planet horizon offset that allows to trace the sky even below the default horizon in case you estimate the horizon line is badly placed" ), m_Module.PlanetRadiusOffsetKm, -20.0f, 0.0f, "Change Planet Radius Offset" );
			}

			if ( GUIHelpers.FoldOut( ref m_bFoldOutRendering, "Rendering Parameters" ) )
			{
				Indent();

				GUIHelpers.Separate();
				m_Module.DownScaleFactor = GUIHelpers.SliderWithCheck( "SkyDownScaleFactor", new GUIContent( "DownScale Factor", "Changes the resolution of the rendering" ), m_Module.DownScaleFactor, 0.05f, 1.0f, "Change DownScale Factor" );
				if ( m_Module.SkyModel == ModulePerspective.SKY_MODEL.COMPLEX )
				{
					m_Module.SkyStepsCount = GUIHelpers.SliderIntWithCheck( "SkyStepsCount", new GUIContent( "Sky Steps Count", "Changes the amount of steps traced in the atmosphere clouds. This has a strong influence on quality but also on speed !" ), m_Module.SkyStepsCount, 4, 64, "Change Sky Steps Count" );
					using ( GUIHelpers.GUIEnabler( m_Module.EnableGodRays = GUIHelpers.CheckBox( new GUIContent( "Enable God Rays", "Enables the clouds casting volumetric shadows. Nice but expensive option !" ), m_Module.EnableGodRays, (m_Module.EnableGodRays ? "Disable" : "Enable") + " God Rays" ) ) )
						m_Module.UnderCloudsMinStepsCount = GUIHelpers.SliderIntWithCheck( "SkyStepsCountGodRays", new GUIContent( "God rays Min Steps Count", "Changes the minimum amount of steps used to trace the godrays. This has a strong influence on godrays quality but also on speed !\nNOTE: In worst case scenarios, when the lowest shadow-casting clouds are near the ground, you can end up with a total of Sky + Godrays Min Steps count to trace, which can dramatically alter framerate !" ), m_Module.UnderCloudsMinStepsCount, 0, 64, "Change Godrays Min Steps Count" );
				}
				m_Module.ComputeEarthShadow = GUIHelpers.CheckBox( new GUIContent( "Enable Earth Shadow", "Enables the Earth's shadowing that brings night sky" ), m_Module.ComputeEarthShadow, (m_Module.ComputeEarthShadow ? "Disable" : "Enable") + " Earth Shadow" );

				UnIndent();
				GUIHelpers.Separate();
			}

			GUIHelpers.Separate();

			m_Module.Fog.Enabled = GUIHelpers.CheckBox( new GUIContent( "Enable Low Altitude Fog", "Enables or disables the low altitude fog" ), m_Module.Fog.Enabled, (m_Module.Fog.Enabled ? "Disable" : "Enable") + "Fog" );
			using ( GUIHelpers.GUIEnabler( m_Module.Fog.Enabled ) )
			{
				GUIHelpers.BeginHorizontal();
				m_bFoldOutFog = GUIHelpers.CustomFoldOut( m_bFoldOutFog, new GUIContent( "Fog Parameters" ) );
				if ( GUILayout.Button( new GUIContent( GUIHelpers.GetIcon( "Icons/Reset" ), "Resets parameters for the fog layer." ), GUIStyle.none, GUILayout.Width( 20 ) ) )
				{	// Reset that layer
					GUIHelpers.RegisterUndo( "Reset Fog Layer" );
					m_Module.Fog.Reset();
				}
				GUIHelpers.EndHorizontal();

				if ( m_bFoldOutFog )
				{
					Indent();
					GUIHelpers.Separate();

					ModulePerspective.FogLayer	Layer = m_Module.Fog;

					// General parameters
					Layer.Altitude = GUIHelpers.Slider( new GUIContent( "Altitude", "Sets the fog altitude (in kilometers) relative to sea level." ), Layer.Altitude, -1.0f, 4.0f, "Change Fog Altitude" );
					Layer.Thickness = GUIHelpers.Slider( new GUIContent( "Thickness", "Sets the fog thickness (in kilometers)." ), Layer.Thickness, 0.0f, 4.0f, "Change Fog Thickness" );
					Layer.CastShadow = GUIHelpers.CheckBox( new GUIContent( "Cast Shadows", "Tells if the layer casts shadows." ), Layer.CastShadow, "Change Layer Cast Shadow" );

					if ( GUIHelpers.FoldOut( ref m_bFoldOutAppearance, "Appearance" ) )
					{
						Indent();

						GameObject	ResultFogLocator = GUIHelpers.SelectObject<GameObject>( new GUIContent( "Locator", "The Nuaj Map Locator that will drive the fog density map." ), Layer.FogLocator, "Select Fog Locator" );
						if ( ResultFogLocator != null )
						{	// Ensure there is a NuajMapLocator component on the object !
							if ( ResultFogLocator.GetComponent<NuajMapLocator>() == null )
								GUIHelpers.MessageBox( "The provided GameObject has no NuajMapLocator component !\nYou need to select a MapLocator... (there is a NuajMapLocator prefab in the \"Prefabs\" folder)", "OK" );
							else
								Layer.FogLocator = ResultFogLocator;
						}
						else
							Layer.FogLocator = ResultFogLocator;

						Layer.MieDensityFactor = GUIHelpers.Slider( new GUIContent( "Mie Density Factor", "Sets the factor to apply to the sky's Mie density.\nThis has the same effect as changing the factor in the fog locator, but is easier to tweak." ), Layer.MieDensityFactor, 0.0f, 10.0f, "Change Fog Density Factor" );
						Layer.DensityRatioBottom = GUIHelpers.Slider( new GUIContent( "Density Bottom Ratio", "Sets the density ratio at the bottom of the fog layer.\nThis is used to increase density depending on the height within the fog layer.\nYou can thus create very dense fog (ratio > 1) at its base or almost inexisting fog (ratio = 0)." ), Layer.DensityRatioBottom, 0.0f, 10.0f, "Change Fog Density Ratio" );
						Layer.MaxDistance = GUIHelpers.Slider( new GUIContent( "Fog Max Distance", "Sets the maximum distance (in kilometers) at which the fog is in effect." ), Layer.MaxDistance, 0.0f, 20.0f, "Change Fog Max Distance" );
						Layer.Color = GUIHelpers.ColorBox( new GUIContent( "Fog Color", "Sets the internal color of the fog.\nDefault is white but you can create funky fog or sandstorm as well." ), Layer.Color, "Change Fog Color" );
						Layer.IsotropicSkyFactor = GUIHelpers.Slider( new GUIContent( "Ambient Sky Factor", "Sets the the factor of isotropic sky diffusion within the fog." ), Layer.IsotropicSkyFactor, .0f, 4.0f, "Change Isotropic Sky Factor" );

						GUIHelpers.Separate();
						Layer.StepsCount = GUIHelpers.SliderIntWithCheck( "FogStepsCount", new GUIContent( "Steps Count", "Sets the amount of steps to use to trace the fog." ), Layer.StepsCount, 1, 32, "Change Fog Steps Count" );
						Layer.StepSize = GUIHelpers.Slider( new GUIContent( "Step Size", "Sets the maximum step size (in kilometers) to take to trace the fog.\nA small value makes the fog more precise but traces only at close range (ideal for dense fogs).\nA large value traces a wide range fog but makes the fog less precise (ideal for large, low density fogs)." ), Layer.StepSize, 0.001f, 2.0f, "Change Fog Step Size" );

						UnIndent();
						GUIHelpers.Separate();
					}

					if ( GUIHelpers.FoldOut( ref m_bFoldOutNoise, "Noise" ) )
					{
						Indent();

						GUIHelpers.BeginHorizontal();
						GUIHelpers.IndentSpace();
						GUIHelpers.ShrinkableLabel( new GUIContent( "Noise Presets" ) );
						if ( GUIHelpers.Button( new GUIContent( "Rain", "Applies rain settings" ), GUILayout.Width( 80.0f ) ) )
							ApplySettings( Layer, FOG_NOISE_PRESETS.RAIN );
						if ( GUIHelpers.Button( new GUIContent( "Mist", "Applies mist settings" ), GUILayout.Width( 80.0f ) ) )
							ApplySettings( Layer, FOG_NOISE_PRESETS.MIST_THICK );
						if ( GUIHelpers.Button( new GUIContent( "Sandstorm", "Applies sandstorm settings" ), GUILayout.Width( 80.0f ) ) )
							ApplySettings( Layer, FOG_NOISE_PRESETS.SANDSTORM );
						GUIHelpers.EndHorizontal();

						Layer.NoiseTilingHorizontal = GUIHelpers.Slider( new GUIContent( "Noise Tiling Horiz.", "Sets the horizontal tiling of the noise texture." ), Layer.NoiseTilingHorizontal, 0.0f, 10.0f, "Change Noise Tiling" );
						Layer.NoiseTilingVertical = GUIHelpers.Slider( new GUIContent( "Noise Tiling Vert.", "Sets the vertical tiling of the noise texture." ), Layer.NoiseTilingVertical, 0.0f, 10.0f, "Change Noise Tiling" );
 						Layer.NoiseAmplitude = GUIHelpers.Slider( new GUIContent( "Noise Amplitude", "Sets the amplitude of the noise perturbation." ), Layer.NoiseAmplitude, 0.0f, 1.0f, "Change Noise Amplitude" );
 						Layer.NoiseOffset = GUIHelpers.Slider( new GUIContent( "Noise Offset", "Sets the offset of the noise perturbation." ), Layer.NoiseOffset, -1.0f, 1.0f, "Change Noise Offset" );

						UnIndent();
						GUIHelpers.Separate();
					}

					if ( GUIHelpers.FoldOut( ref m_bFoldOutAnimation, "Animation" ) )
					{
						Indent();

						Layer.WindForce = GUIHelpers.Slider( new GUIContent( "Wind Force", "Sets the force of the wind." ), Layer.WindForce, 0.0f, 1.0f, "Change Wind Force" );
						Layer.WindDirectionAngle = Mathf.Deg2Rad * GUIHelpers.Slider( new GUIContent( "Wind Direction", "Sets the 2D direction of the wind." ), Layer.WindDirectionAngle * Mathf.Rad2Deg, -180.0f, 180.0f, "Change Smoothness" );
						Layer.DownpourStrength = GUIHelpers.Slider( new GUIContent( "Downpour Strength", "Sets the strength of the rain downpour." ), Layer.DownpourStrength, 0.0f, 4.0f, "Change Downpour Strength" );

						UnIndent();
						GUIHelpers.Separate();
					}

					UnIndent();
					GUIHelpers.Separate();
				}
			}

			return true;
		}

		protected void	ApplySettings( ModulePerspective.FogLayer _Fog, FOG_NOISE_PRESETS _Preset )
		{
			GUIHelpers.RegisterUndo( "Apply Fog Preset" );

			switch ( _Preset )
			{
				case FOG_NOISE_PRESETS.RAIN:
					_Fog.StepSize = 0.2f;
					_Fog.NoiseTilingHorizontal = 3.5f;
					_Fog.NoiseTilingVertical = 0.125f;
					_Fog.NoiseAmplitude = 0.25f;
					_Fog.NoiseOffset = -0.75f;
					_Fog.DownpourStrength = 3.0f;
					break;
				case FOG_NOISE_PRESETS.MIST_THICK:
					_Fog.StepSize = 1.0f;
					_Fog.NoiseTilingHorizontal = 0.05f;
					_Fog.NoiseTilingVertical = 0.05f;
					_Fog.NoiseAmplitude = 0.5f;
					_Fog.NoiseOffset = 0.0f;
					_Fog.DownpourStrength = 0.0f;
					break;
				case FOG_NOISE_PRESETS.SANDSTORM:
					_Fog.StepSize = 0.4f;
					_Fog.NoiseTilingHorizontal = 0.25f;
					_Fog.NoiseTilingVertical = 0.25f;
					_Fog.NoiseAmplitude = 1.0f;
					_Fog.NoiseOffset = -0.2f;
					_Fog.DownpourStrength = 0.0f;
					break;
			}
		}

		#endregion
	}
}