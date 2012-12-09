using System;
using System.Collections;
using UnityEngine;
using UnityEditor;

using Nuaj;

namespace Nuaj.GUI
{
	/// <summary>
	/// Cloud Layer editor
	/// </summary>
	public class ModuleEditorCloudLayer : ModuleEditorBase
	{
		#region CONSTANTS

		protected const float	MAX_DENSITY = 1.0f;
		protected const float	MAX_MEAN_FREE_PATH = 200.0f;

		#endregion

		#region NESTED TYPES

		protected enum CLOUD_NOISE_PRESETS
		{
			STANDARD,
			WEBBY,
			BUMPY,
			WISPY
		}

		#endregion

		#region FIELDS

		protected ModuleCloudLayer	m_Module = null;

		protected bool[]			m_bFoldOutAppearance = new bool[4] { true, true, true, true };
		protected bool[]			m_bFoldOutAppearanceTextures = new bool[4] { false, false, false, false };
		protected bool[]			m_bFoldOutNoise = new bool[4] { false, false, false, false };
		protected bool[]			m_bFoldOutAnimation = new bool[4] { false, false, false, false };
		protected bool[]			m_bFoldOutAdvanced = new bool[4] { false, false, false, false };

		protected GUIContent[]		m_LayerFoldOutsGUIContents = new GUIContent[4]
		{
			new GUIContent( "First Layer" ),
			new GUIContent( "Second Layer" ),
			new GUIContent( "Third Layer" ),
			new GUIContent( "Fourth Layer" ),
		};

		#endregion

		#region PROPERTIES

		public override GUIContent TabCaption
		{
			get { return new GUIContent( "2D Clouds", "Edits the configuration for the 2D cloud layers module" ); }
		}

		protected override string ModuleInfos
		{
			get { return	"Cloud Layer Module\n" +
							"This module renders layers of flat, high altitude clouds.\n" +
							""; }
		}

		protected override string HelpURL
		{
			get { return "2d-clouds-module"; }
		}

		#endregion

		#region METHODS

		public ModuleEditorCloudLayer( ModuleCloudLayer _Module ) : base( _Module )
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

			using ( GUIHelpers.GUIEnabler( true ) )
			{
				//////////////////////////////////////////////////////////////////////////
				GUIHelpers.BeginHorizontal();

				GUIHelpers.IndentSpace();
				GUIHelpers.ShrinkableLabel( new GUIContent( "Add Layer" ) );

				// Show the "Add Layer" button
				using ( GUIHelpers.GUIEnabler( m_Module.CloudLayersCount < 4 ) )
					if ( GUILayout.Button( new GUIContent( "+", "Adds a new cloud layer." ), GUILayout.Width( 40 ) ) )
					{
						if ( m_Module.CloudLayersCount < 4 )
							m_Module.AddLayer( ModuleCloudLayer.CloudLayer.DEFAULT_ALTITUDE, ModuleCloudLayer.CloudLayer.DEFAULT_THICKNESS );	// Add a new layer
						else
							GUIHelpers.MessageBox( "There are already 4 existing cloud layers.\nYou cannot add anymore as only a maximum of 4 is supported.", "OK" );
					}

				GUIHelpers.EndHorizontal();

				//////////////////////////////////////////////////////////////////////////
				// Display individual layers
				Nuaj.ModuleCloudLayer.CloudLayer[]	Layers = m_Module.CloudLayers as Nuaj.ModuleCloudLayer.CloudLayer[];
				Nuaj.ModuleCloudLayer.CloudLayer	SelectedLayer = m_Module.SelectedLayer;

				Color	DefaultColor = UnityEngine.GUI.backgroundColor;
				Color	NoSelectionColor = new Color( 1.3f * DefaultColor.r, 1.3f * DefaultColor.g, 1.3f * DefaultColor.b );
				Color	SelectionColor = new Color( NoSelectionColor.r + 0.5f, NoSelectionColor.g, NoSelectionColor.b );

				for (int LayerIndex=0; LayerIndex < Math.Min( 4, Layers.Length ); LayerIndex++ )
				{
					Nuaj.ModuleCloudLayer.CloudLayer L = Layers[LayerIndex];

					// Change color based on selection
					UnityEngine.GUI.backgroundColor = L == SelectedLayer ? SelectionColor : NoSelectionColor;

					GUIHelpers.BeginHorizontal();
					bool	bFoldOut = GUIHelpers.CustomFoldOut( L == SelectedLayer, m_LayerFoldOutsGUIContents[LayerIndex] );
					if ( GUILayout.Button( new GUIContent( GUIHelpers.GetIcon( "Icons/Reset" ), "Resets parameters for the layer." ), GUIStyle.none, GUILayout.Width( 20 ) ) )
					{	// Reset that layer
						GUIHelpers.RegisterUndo( "Reset Layer" );
						L.Reset();
					}
					if ( GUILayout.Button( new GUIContent( GUIHelpers.GetIcon( "Icons/Remove" ), "Removes the layer." ), GUIStyle.none, GUILayout.Width( 24 ) ) )
					{	// Remove that layer
						if ( GUIHelpers.MessageBox( "Are you sure you wish to remove the layer ?", "Yes", "No" ) )
						{
							m_Module.RemoveLayer( L );
							GUIHelpers.EnableHorizontalGroups = true;
							GUIHelpers.EndHorizontal();
							return true;
						}
					}
					GUIHelpers.EndHorizontal();

					if ( bFoldOut )
					{	// Display the content of our selected layer
						Indent();
						DisplayCloudLayer( L, LayerIndex );
						SelectedLayer = L;
						UnIndent();
					}
					else if ( L == SelectedLayer )
						SelectedLayer = null;	// The user closed the foldout, clearing the selection as well
				}

				// Restore color state
				UnityEngine.GUI.backgroundColor = DefaultColor;

				// Update selection
				m_Module.SelectedLayer = SelectedLayer;
			}

			return true;
		}

		#region Layer GUI

		protected void	DisplayCloudLayer( Nuaj.ModuleCloudLayer.CloudLayer _Layer, int _LayerIndex )
		{
			_Layer.Enabled = GUIHelpers.CheckBox( new GUIContent( "Enabled", "Enables or disables the layer.\nRemember that you can only have up to 4 active layers of any kind at the same time." ), _Layer.Enabled, (_Layer.Enabled ? "Disable" : "Enable") + " Cloud Layer" );

			using ( GUIHelpers.GUIEnabler( _Layer.Enabled ) )
			{
				// General parameters
				_Layer.Altitude = GUIHelpers.Slider( new GUIContent( "Altitude", "Sets the cloud's altitude (in kilometers) relative to sea level." ), _Layer.Altitude, 0.0f, 20.0f, "Change Cloud Altitude" );
				_Layer.Thickness = GUIHelpers.Slider( new GUIContent( "Thickness", "Sets the cloud's thickness (in kilometers)." ), _Layer.Thickness, 0.0f, 1.0f, "Change Cloud Thickness" );
				_Layer.CastShadow = GUIHelpers.CheckBox( new GUIContent( "Cast Shadows", "Tells if the layer casts shadows." ), _Layer.CastShadow, "Change Layer Cast Shadow" );

				if ( GUIHelpers.FoldOut( ref m_bFoldOutAppearance[_LayerIndex], "Appearance" ) )
				{
					Indent();

					_Layer.Coverage = GUIHelpers.Slider( new GUIContent( "Coverage", "Sets the cloud coverage." ), _Layer.Coverage, -1.0f, 1.0f, "Change Coverage" );
					_Layer.Density = 0.02f * GUIHelpers.Slider( new GUIContent( "Density", "Sets the cloud's density cloud density that influences the capacity of the cloud to absorb and scatter light." ), 50.0f * _Layer.Density, 0.0f, MAX_DENSITY, "Change Cloud Density" );
					_Layer.NormalAmplitude = GUIHelpers.Slider( new GUIContent( "Normal Amplitude", "Sets the importance of the normal map.\nA large amplitude may increase the impression of volume but too large a value can look more water than cloud.\nThis way, you can create a more \"stormy look\" below the layer." ), _Layer.NormalAmplitude, 0.0f, 1.0f, "Change Normal Amplitude" );
					_Layer.Smoothness = GUIHelpers.Slider( new GUIContent( "Smoothness", "Sets the smoothness of the cloud." ), _Layer.Smoothness, 0.0f, 8.0f, "Change Smoothness" );
					_Layer.CloudColor = GUIHelpers.ColorBox( new GUIContent( "Cloud Color", "Sets the internal color of the cloud.\nDefault is white but you can create funky clouds as well." ), _Layer.CloudColor, "Change Cloud Color" );

					UnIndent();
					GUIHelpers.Separate();
				}

				if ( GUIHelpers.FoldOut( ref m_bFoldOutNoise[_LayerIndex], "Noise" ) )
				{
					Indent();

					_Layer.NoiseTiling = 0.006f * GUIHelpers.Slider( new GUIContent( "Noise Tiling", "Sets the tiling of the noise texture." ), _Layer.NoiseTiling / 0.006f, 0.0f, 10.0f, "Change Noise Tiling" );
					_Layer.NoiseOctavesCount = GUIHelpers.SliderInt( new GUIContent( "Octaves Count", "Sets the amount of noise octaves.\nEach new octave adss more fine detail to the cloud but also eats more time." ), _Layer.NoiseOctavesCount, 1, 4, "Change Noise Octaves" );
					_Layer.FrequencyFactor = GUIHelpers.Slider( new GUIContent( "Frequency Factor", "Sets the frequency factor for each new octave.\nThis guides the increase in tiling size as we use more noise octaves." ), _Layer.FrequencyFactor, 0.0f, 4.0f, "Change Frequency Factor" );
					_Layer.FrequencyFactorAnisotropy = GUIHelpers.Slider( new GUIContent( "Frequency Anisotropy", "Sets the frequency anisotropy in the Y direction.\nThis allows you to squeeze or stretch the cloud in a particular direction to make them more wispy." ), _Layer.FrequencyFactorAnisotropy, -2.0f, 2.0f, "Change Frequency Anisotropy" );
					_Layer.AmplitudeFactor = GUIHelpers.Slider( new GUIContent( "Amplitude Factor", "Sets the amplitude factor for each new octave.\nThis guides the increase in amplitude (weight) as we use more noise octaves." ), _Layer.AmplitudeFactor, 0.0f, 4.0f, "Change Amplitude Factor" );

					if ( GUIHelpers.FoldOut( ref m_bFoldOutAppearanceTextures[_LayerIndex], "Noise Textures" ) )
					{
						GUIHelpers.Separate();

						GUIHelpers.BeginHorizontal();
						GUIHelpers.IndentSpace();
						GUIHelpers.ShrinkableLabel( new GUIContent( "Noise Presets" ) );
						if ( GUIHelpers.Button( new GUIContent( "Standard", "Applies standard settings" ), GUILayout.Width( 80.0f ) ) )
							ApplySettings( _Layer, CLOUD_NOISE_PRESETS.STANDARD );
						if ( GUIHelpers.Button( new GUIContent( "Wispy", "Applies wispy settings" ), GUILayout.Width( 80.0f ) ) )
							ApplySettings( _Layer, CLOUD_NOISE_PRESETS.WISPY );
						if ( GUIHelpers.Button( new GUIContent( "Bumpy", "Applies bumpy settings" ), GUILayout.Width( 80.0f ) ) )
							ApplySettings( _Layer, CLOUD_NOISE_PRESETS.BUMPY);
						if ( GUIHelpers.Button( new GUIContent( "Webby", "Applies webby settings" ), GUILayout.Width( 80.0f ) ) )
							ApplySettings( _Layer, CLOUD_NOISE_PRESETS.WEBBY);
						GUIHelpers.EndHorizontal();

						_Layer.NoiseTexture0 = GUIHelpers.SelectTexture( new GUIContent( "Noise Texture 0", "Sets the Normal (RGB) + Height (A) noise texture for octave #0." ), _Layer.NoiseTexture0, "Change Layer Noise Texture 0" );
						_Layer.NoiseTexture1 = GUIHelpers.SelectTexture( new GUIContent( "Noise Texture 1", "Sets the Normal (RGB) + Height (A) noise texture for octave #1." ), _Layer.NoiseTexture1, "Change Layer Noise Texture 1" );
						_Layer.NoiseTexture2 = GUIHelpers.SelectTexture( new GUIContent( "Noise Texture 2", "Sets the Normal (RGB) + Height (A) noise texture for octave #2." ), _Layer.NoiseTexture2, "Change Layer Noise Texture 2" );
						_Layer.NoiseTexture3 = GUIHelpers.SelectTexture( new GUIContent( "Noise Texture 3", "Sets the Normal (RGB) + Height (A) noise texture for octave #3." ), _Layer.NoiseTexture3, "Change Layer Noise Texture 3" );
					}

					UnIndent();
					GUIHelpers.Separate();
				}

				if ( GUIHelpers.FoldOut( ref m_bFoldOutAnimation[_LayerIndex], "Animation" ) )
				{
					Indent();

					_Layer.WindForce = GUIHelpers.Slider( new GUIContent( "Wind Force", "Sets the force of the wind." ), _Layer.WindForce, 0.0f, 1.0f, "Change Wind Force" );
					_Layer.WindDirectionAngle = Mathf.Deg2Rad * GUIHelpers.Slider( new GUIContent( "Wind Direction", "Sets the 2D direction of the wind." ), _Layer.WindDirectionAngle * Mathf.Rad2Deg, -180.0f, 180.0f, "Change Smoothness" );
					_Layer.EvolutionSpeed = GUIHelpers.Slider( new GUIContent( "Evolution Speed", "Sets the speed at which the clouds evolve.\n(only works if you have more than 1 octave of noise !)" ), _Layer.EvolutionSpeed, -10.0f, 10.0f, "Change Evolution Speed" );

					UnIndent();
					GUIHelpers.Separate();
				}

				if ( GUIHelpers.FoldOut( ref m_bFoldOutAdvanced[_LayerIndex], "Advanced" ) )
				{
					Indent();

					_Layer.FactorZeroScattering = GUIHelpers.Slider( new GUIContent( "Zero Scattering", "Sets the zero scattering factor." ), _Layer.FactorZeroScattering, 0.0f, 10.0f, "Change Zero Scattering Factor" );
					_Layer.FactorSingleScattering = GUIHelpers.Slider( new GUIContent( "Single Scattering", "Sets the single scattering factor." ), _Layer.FactorSingleScattering, 0.0f, 100.0f, "Change Single Scattering Factor" );
					_Layer.FactorDoubleScattering = GUIHelpers.Slider( new GUIContent( "Double Scattering", "Sets the double scattering factor." ), _Layer.FactorDoubleScattering, 0.0f, 1000.0f, "Change Double Scattering Factor" );
					_Layer.FactorMultipleScattering = GUIHelpers.Slider( new GUIContent( "Multiple Scattering", "Sets the multiple scattering factor." ), _Layer.FactorMultipleScattering, 0.0f, 1.0f, "Change Single Scattering Factor" );
					_Layer.FactorSkyColor = GUIHelpers.Slider( new GUIContent( "Sky Scattering", "Sets the sky scattering factor for sky light passing though the clouds." ), _Layer.FactorSkyColor, 0.0f, 0.1f, "Change Sky Scattering Factor" );
					_Layer.FactorTerrainColor = GUIHelpers.Slider( new GUIContent( "Terrain Scattering", "Sets the terrain scattering factor for light reflected on the terrain." ), _Layer.FactorTerrainColor, 0.0f, 0.1f, "Change Terrain Scattering Factor" );

					UnIndent();
					GUIHelpers.Separate();
				}
			}
		}

		protected void	ApplySettings( ModuleCloudLayer.CloudLayer _Layer, CLOUD_NOISE_PRESETS _Preset )
		{
			string	Path = "";
			switch ( _Preset )
			{
				case CLOUD_NOISE_PRESETS.STANDARD:
					Path = "Standard";
					break;
				case CLOUD_NOISE_PRESETS.BUMPY:
					Path = "Bumpy";
					break;
				case CLOUD_NOISE_PRESETS.WISPY:
					Path = "Wispy";
					break;
				case CLOUD_NOISE_PRESETS.WEBBY:
					Path = "Webby";
					break;
			}

			string	FullPath = "CloudLayers/" + Path + "/Octave";

			// Load and apply textures
			_Layer.NoiseTexture0 = Nuaj.Help.LoadTextureResource( FullPath + "0" );
			_Layer.NoiseTexture1 = Nuaj.Help.LoadTextureResource( FullPath + "1" );
			_Layer.NoiseTexture2 = Nuaj.Help.LoadTextureResource( FullPath + "2" );
			_Layer.NoiseTexture3 = Nuaj.Help.LoadTextureResource( FullPath + "3" );
		}

		#endregion

		#endregion
	}
}