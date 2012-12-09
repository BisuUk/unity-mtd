using System;
using System.Collections;
using UnityEngine;
using UnityEditor;

using Nuaj;

namespace Nuaj.GUI
{
	/// <summary>
	/// Volume Cloud editor
	/// </summary>
	public class ModuleEditorCloudVolume : ModuleEditorBase
	{
		#region CONSTANTS

		protected const float	MAX_DENSITY = 1.0f;
		protected const float	MAX_MEAN_FREE_PATH = 200.0f;

		#endregion

		#region FIELDS

		protected ModuleCloudVolume	m_Module = null;

		protected bool[]			m_bFoldOutShadow = new bool[4] { false, false, false, false };
		protected bool[]			m_bFoldOutAppearance = new bool[4] { true, true, true, true };
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
			get { return new GUIContent( "3D Clouds", "Edits the configuration for the 3D volume clouds module" ); }
		}

		protected override string ModuleInfos
		{
			get { return	"Volume Cloud Module\n" +
							"This module renders volume clouds.\n" +
							""; }
		}

		protected override string HelpURL
		{
			get { return "3d-clouds-module"; }
		}

		#endregion

		#region METHODS

		public ModuleEditorCloudVolume( ModuleCloudVolume _Module ) : base( _Module )
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
				m_Module.DownScaleFactor = GUIHelpers.SliderWithCheck( "CloudVolumeDownscaleFactor", new GUIContent( "DownScale Factor", "Changes the resolution of the rendering.\nThis has a huge impact on speed but also on cloud blurriness." ), m_Module.DownScaleFactor, 0.05f, 1.0f, "Change DownScale Factor" );

				//////////////////////////////////////////////////////////////////////////
				GUIHelpers.BeginHorizontal();

				GUIHelpers.IndentSpace();
				GUIHelpers.ShrinkableLabel( new GUIContent( "Add Layer" ) );

				// Show the "Add Layer" button
				using ( GUIHelpers.GUIEnabler( m_Module.CloudLayersCount < 4 ) )
					if ( GUIHelpers.Button( new GUIContent( "+", "Adds a new cloud layer." ), GUILayout.Width( 40 ) ) )
					{
						if ( m_Module.CloudLayersCount < 4 )
							m_Module.SelectedLayer = m_Module.AddLayer( ModuleCloudVolume.CloudLayer.DEFAULT_ALTITUDE, ModuleCloudVolume.CloudLayer.DEFAULT_THICKNESS );	// Add a new layer
						else
							GUIHelpers.MessageBox( "There are already 4 existing cloud layers.\nYou cannot add anymore as only a maximum of 4 is supported.", "OK" );
					}

				GUIHelpers.EndHorizontal();

				//////////////////////////////////////////////////////////////////////////
				// Display individual layers
				Nuaj.ModuleCloudVolume.CloudLayer[]	Layers = m_Module.CloudLayers as Nuaj.ModuleCloudVolume.CloudLayer[];
				Nuaj.ModuleCloudVolume.CloudLayer	SelectedLayer = m_Module.SelectedLayer;

				Color	DefaultColor = UnityEngine.GUI.backgroundColor;
				Color	NoSelectionColor = new Color( 1.3f * DefaultColor.r, 1.3f * DefaultColor.g, 1.3f * DefaultColor.b );
				Color	SelectionColor = new Color( NoSelectionColor.r + 0.5f, NoSelectionColor.g, NoSelectionColor.b );

				for ( int LayerIndex=0; LayerIndex < Math.Min( 4, Layers.Length ); LayerIndex++ )
				{
					Nuaj.ModuleCloudVolume.CloudLayer L = Layers[LayerIndex];

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

		protected void	DisplayCloudLayer( Nuaj.ModuleCloudVolume.CloudLayer _Layer, int _LayerIndex )
		{
			_Layer.Enabled = GUIHelpers.CheckBox( new GUIContent( "Enabled", "Enables or disables the layer.\nRemember that you can only have up to 4 active layers of any kind at the same time." ), _Layer.Enabled, (_Layer.Enabled ? "Disable" : "Enable") + " Cloud Layer" );

			using ( GUIHelpers.GUIEnabler( _Layer.Enabled ) )
			{
				// General parameters
				_Layer.Altitude = GUIHelpers.Slider( new GUIContent( "Altitude", "Sets the cloud's altitude (in kilometers) relative to sea level." ), _Layer.Altitude, -4.0f, 20.0f, "Change Cloud Altitude" );
				_Layer.Thickness = GUIHelpers.Slider( new GUIContent( "Thickness", "Sets the cloud's thickness (in kilometers)." ), _Layer.Thickness, 0.0f, 8.0f, "Change Cloud Thickness" );
				_Layer.CastShadow = GUIHelpers.CheckBox( new GUIContent( "Cast Shadows", "Tells if the layer casts shadows." ), _Layer.CastShadow, "Change Layer Cast Shadow" );
				using ( GUIHelpers.GUIEnabler( _Layer.CastShadow ) )
				{
					if ( GUIHelpers.FoldOut( ref m_bFoldOutShadow[_LayerIndex], "Shadow Map" ) )
					{
						_Layer.ShadowMapSize = GUIHelpers.SliderIntWithCheck( "CloudVolumeShadowMapSize" + _LayerIndex, new GUIContent( "Shadow Map Size", "Sets the size of the internal deep shadow map.\nThe cloud rendering requires an internal \"deep\" shadow map for its own rendering purpose. Its resolution can be different than the global shadow map." ), _Layer.ShadowMapSize, 64, 1024, "Change Shadow Map Size" );
						_Layer.ShadowQuality = (Nuaj.ModuleCloudVolume.CloudLayer.SHADOW_QUALITY) GUIHelpers.ComboBox( new GUIContent( "Shadow Quality", "Sets the quality of the deep shadow map.\nThe deep shadow map can contain up to 3 layers" ), _Layer.ShadowQuality, "Change Shadow Map Quality" );
						using ( GUIHelpers.GUIEnabler( _Layer.SmoothShadowMap = GUIHelpers.CheckBox( new GUIContent( "Smooth Shadow Map", "Tells if we should smooth out the shadow map" ), _Layer.SmoothShadowMap, "Change Smooth Shadow Map" ) ) )
							_Layer.SmoothSize = GUIHelpers.Slider( new GUIContent( "Smooth Size", "Sets the size of the smoothing kernel." ), _Layer.SmoothSize, 0.0f, 4.0f, "Change Smooth Size" );
					}
				}

				if ( GUIHelpers.FoldOut( ref m_bFoldOutAppearance[_LayerIndex], "Appearance" ) )
				{
					Indent();

					_Layer.Coverage = GUIHelpers.Slider( new GUIContent( "Coverage", "Sets the cloud coverage." ), _Layer.Coverage, -1.0f, 1.0f, "Change Coverage" );
					_Layer.Density = 5.0e-3f * GUIHelpers.Slider( new GUIContent( "Density", "Sets the cloud's density cloud density that influences the capacity of the cloud to absorb and scatter light." ), 0.2e3f * _Layer.Density, 0.0f, MAX_DENSITY, "Change Cloud Density" );
					_Layer.CloudColor = GUIHelpers.ColorBox( new GUIContent( "Cloud Color", "Sets the internal color of the cloud.\nDefault is white but you can create funky clouds as well." ), _Layer.CloudColor, "Change Cloud Color" );
					_Layer.TraceLimiter = GUIHelpers.Slider( new GUIContent( "Trace Limiter", "Sets the trace limiter that helps to avoid tracing too large steps within the clouds.\nThis helps avoiding artifacts when traveling through the clouds." ), _Layer.TraceLimiter, 0.0f, 1.0f, "Change Trace Limiter" );
					GUIHelpers.Separate();

					GUIHelpers.BoldLabel( new GUIContent( "Horizon Blend" ) );
					_Layer.HorizonBlendStart = GUIHelpers.Slider( new GUIContent( "Blend Start", "Sets the distance (in kilometers) at which we start blending with the horizon." ), _Layer.HorizonBlendStart, 0.0f, 200.0f, "Change Horizon Blend Start" );
					_Layer.HorizonBlendEnd = GUIHelpers.Slider( new GUIContent( "Blend End", "Sets the distance (in kilometers) at which we fully blend with the horizon." ), _Layer.HorizonBlendEnd, 0.0f, 200.0f, "Change Horizon Blend End" );
					_Layer.HorizonBlendValue = GUIHelpers.Slider( new GUIContent( "Blend Type", "Sets the blend value indicating if we should blend to empty cloud density (0) or full cloud density (1).\nA value of 0 will let the horizon appear in the distance, while a value of 1 will make the horizon completely filled with clouds" ), _Layer.HorizonBlendValue, 0.0f, 1.0f, "Change Horizon Blend Value" );
					GUIHelpers.Separate();

					_Layer.StepsCount = GUIHelpers.SliderIntWithCheck( "CloudVolumeStepsCount" + _LayerIndex, new GUIContent( "Steps Count", "Sets the amount of rendering steps per pixel.\nThis has a huge influence on quality but also on speed." ), _Layer.StepsCount, 4, 128, "Change Cloud Steps Count" );

					UnIndent();
					GUIHelpers.Separate();
				}

				if ( GUIHelpers.FoldOut( ref m_bFoldOutNoise[_LayerIndex], "Noise" ) )
				{
					Indent();

					_Layer.NoiseTiling = 0.02f * GUIHelpers.Slider( new GUIContent( "Noise Tiling", "Sets the tiling of the noise texture." ), _Layer.NoiseTiling / 0.02f, 0.0f, 10.0f, "Change Noise Tiling" );
					_Layer.FrequencyFactor = GUIHelpers.Slider( new GUIContent( "Frequency Factor", "Sets the frequency factor for each new octave.\nThis guides the increase in tiling size as we use more noise octaves." ), _Layer.FrequencyFactor, 0.0f, 8.0f, "Change Frequency Factor" );
					_Layer.AmplitudeFactor = GUIHelpers.Slider( new GUIContent( "Amplitude Factor", "Sets the amplitude factor for each new octave.\nThis guides the increase in amplitude (weight) as we use more noise octaves." ), _Layer.AmplitudeFactor, 0.0f, 4.0f, "Change Amplitude Factor" );

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

					_Layer.Albedo = GUIHelpers.Slider( new GUIContent( "Cloud Albedo", "Sets the cloud albedo.\nCloud albedo (i.e. the ability of the cloud to scatter and reflect light) is defined as a ratio of the Extinction.\nA value of 0 will yield extremely dark clouds while a value of 1 will reflect all light and absorb nothing (in nature, it is usually considered to be almost 1, because clouds are mostly composed of small water droplets that mainly reflect light : almost no absorption occurs, hence the whiteness of clouds)" ), _Layer.Albedo, 0.0f, 1.0f, "Change Cloud Albedo" );
					_Layer.DirectionalFactor = GUIHelpers.Slider( new GUIContent( "Directional Factor", "Sets the factor applied to directional lighting." ), _Layer.DirectionalFactor, 0.0f, 1.0f, "Change Directional Factor" );
					_Layer.IsotropicFactor = GUIHelpers.Slider( new GUIContent( "Isotropic Factor", "Sets the factor applied to isotropic lighting." ), _Layer.IsotropicFactor, 0.0f, 1.0f, "Change Isotropic Factor" );

					_Layer.IsotropicFactorSky = GUIHelpers.Slider( new GUIContent( "Isotropic Sky Factor", "Sets the factor applied to isotropic diffusion of sky light." ), _Layer.IsotropicFactorSky, 0.0f, 10.0f, "Change Isotropic Sky Factor" );
					_Layer.IsotropicFactorTerrain = GUIHelpers.Slider( new GUIContent( "Isotropic Terrain Factor", "Sets the factor applied to isotropic diffusion of light reflected on terrain." ), _Layer.IsotropicFactorTerrain, 0.0f, 1.0f, "Change Isotropic Terrain Factor" );

					_Layer.IsotropicDensity = GUIHelpers.Slider( new GUIContent( "Isotropic Density", "Sets the density for isotropic (i.e. sky and terrain reflection) light diffusion." ), _Layer.IsotropicDensity, 0.0f, 1.0f, "Change Isotropic Constant" );

					// Phase parameters
					GUIHelpers.Separate();

					GUIHelpers.BoldLabel( new GUIContent( "Strong-Forward Phase", "" ) );
					_Layer.PhaseAnisotropyStrongForward = GUIHelpers.Slider( new GUIContent( "Anisotropy", "Sets the anisotropy of the strong forward phase function." ), _Layer.PhaseAnisotropyStrongForward, -1.0f, 1.0f, "Change Phase Anisotropy" );
					_Layer.PhaseWeightStrongForward = GUIHelpers.Slider( new GUIContent( "Weight", "Sets the weight of the strong forward phase function." ), _Layer.PhaseWeightStrongForward, 0.0f, 1.0f, "Change Phase Weight" );

					GUIHelpers.BoldLabel( new GUIContent( "Forward Phase", "" ) );
					_Layer.PhaseAnisotropyForward = GUIHelpers.Slider( new GUIContent( "Anisotropy", "Sets the anisotropy of the forward phase function." ), _Layer.PhaseAnisotropyForward, -1.0f, 1.0f, "Change Phase Anisotropy" );
					_Layer.PhaseWeightForward = GUIHelpers.Slider( new GUIContent( "Weight", "Sets the weight of the forward phase function." ), _Layer.PhaseWeightForward, 0.0f, 1.0f, "Change Phase Weight" );

					GUIHelpers.BoldLabel( new GUIContent( "Backward Phase", "" ) );
					_Layer.PhaseAnisotropyBackward = GUIHelpers.Slider( new GUIContent( "Anisotropy", "Sets the anisotropy of the backward phase function." ), _Layer.PhaseAnisotropyBackward, -1.0f, 1.0f, "Change Phase Anisotropy" );
					_Layer.PhaseWeightBackward = GUIHelpers.Slider( new GUIContent( "Weight", "Sets the weight of the backward phase function." ), _Layer.PhaseWeightBackward, 0.0f, 1.0f, "Change Phase Weight" );

					GUIHelpers.BoldLabel( new GUIContent( "Sideway Phase", "" ) );
					_Layer.PhaseAnisotropySide = GUIHelpers.Slider( new GUIContent( "Anisotropy", "Sets the anisotropy of the sideway phase function." ), _Layer.PhaseAnisotropySide, -1.0f, 1.0f, "Change Phase Anisotropy" );
					_Layer.PhaseWeightSide = GUIHelpers.Slider( new GUIContent( "Weight", "Sets the weight of the sideway phase function." ), _Layer.PhaseWeightSide, 0.0f, 1.0f, "Change Phase Weight" );

					UnIndent();
					GUIHelpers.Separate();
				}
			}
		}

		#endregion

		#endregion
	}
}