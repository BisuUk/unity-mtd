using System;
using System.Collections;
using UnityEngine;
using UnityEditor;

using Nuaj;

namespace Nuaj.GUI
{
	/// <summary>
	/// Main manager editor
	/// </summary>
	public class ModuleEditorMain : ModuleEditorBase
	{
		#region FIELDS

		protected NuajManager	m_Module = null;

		[SerializeField] protected bool	m_bFoldOutSun = true;
		[SerializeField] protected bool	m_bFoldOutWorld = false;
		[SerializeField] protected bool	m_bFoldOutShadowMap = false;
		[SerializeField] protected bool	m_bFoldOutLocalVariations = false;
		[SerializeField] protected bool	m_bFoldOutToneMapping = false;
		[SerializeField] protected bool	m_bFoldOutLightning = false;
		[SerializeField] protected bool	m_bFoldOutLuminanceAdaptation = false;
		[SerializeField] protected bool	m_bFoldOutGlowSupport = false;

		#endregion

		#region PROPERTIES

		public override GUIContent TabCaption
		{
			get { return new GUIContent( "Nuaj", "Main manager configuration" ); }
		}

		protected override string ModuleInfos
		{
			get { return	"Nuaj' Main Control Panel\n" +
							"All global parameters can be found here."; }
		}

		protected override string HelpURL
		{
			get { return "main-control-panel"; }
		}

		#endregion

		#region METHODS

		public ModuleEditorMain( NuajManager _Manager ) : base( null )
		{
			m_Module = _Manager;
		}

		public override bool	OnInspectorGUISimple()
		{
			if ( m_Module.IsInErrorState )
			{
				ShowErrorState();
				return false;
			}

			base.OnInspectorGUISimple();

			return true;
		}

		public override bool	OnInspectorGUIAdvanced()
		{
			if ( m_Module.IsInErrorState )
			{
				ShowErrorState();
				return false;
			}

			base.OnInspectorGUIAdvanced();

			return true;
		}

		protected override void OnInspectorGUICommon()
		{
			base.OnInspectorGUICommon();

			if ( m_Module.IsInWarningState )
				ShowWarningState();

			GameObject	ResultCamera = GUIHelpers.SelectObject<GameObject>( new GUIContent( "Drive Camera*", "The camera to work with. Nuaj' MUST have a camera otherwise it will not render." ), m_Module.Camera, "Select Nuaj' Drive Camera" );
			if ( ResultCamera != null )
			{	// Ensure there is a camera component on the camera object !
				if ( ResultCamera.GetComponent<Camera>() == null )
					GUIHelpers.MessageBox( "The provided GameObject has no camera component !\nYou need to select a camera...", "OK" );
				else
					m_Module.Camera = ResultCamera;
			}
			else
				m_Module.Camera = ResultCamera;

			if ( GUIHelpers.FoldOut( ref m_bFoldOutSun, "Sun Parameters" ) )
			{
				Indent();

				m_Module.SunElevation = Mathf.Deg2Rad * GUIHelpers.Slider( new GUIContent( "Sun Elevation", "Changes the Sun's elevation angle" ), Mathf.Rad2Deg * m_Module.SunElevation, 0.0f, 180.0f, "Change Sun Elevation" );
				m_Module.SunAzimuth = Mathf.Deg2Rad * GUIHelpers.Slider( new GUIContent( "Sun Azimuth", "Changes the Sun's azimuth angle" ), Mathf.Rad2Deg * m_Module.SunAzimuth, -180.0f, 180.0f, "Change Sun Azimuth" );

				GUIHelpers.Separate();
				GUIHelpers.BeginHorizontal();
				GUIHelpers.IndentSpace();
				GUIHelpers.ShrinkableLabel( new GUIContent( "Nuaj' Drives the Sun", "" ) );
				m_Module.NuajDrivesSunDirection = GUIHelpers.CheckBoxNoLabel( new GUIContent( "Direction", "If checked, Nuaj's drives the Sun object's direction.\r\nIf unchecked, the Sun object drives Nuaj's sun direction." ), m_Module.NuajDrivesSunDirection, 70 ,"Change Nuaj' Drives Sun Direction" );
				m_Module.NuajDrivesSunDirectionalColor = GUIHelpers.CheckBoxNoLabel( new GUIContent( "Color", "If checked, Nuaj's drives the Sun object's color (must be a light though)" ), m_Module.NuajDrivesSunDirectionalColor, 70 ,"Change Nuaj' Drives Sun Color" );
				m_Module.NuajDrivesSunAmbientColor = GUIHelpers.CheckBoxNoLabel( new GUIContent( "Ambient", "If checked, Nuaj's drives the scene's ambient lighting." ), m_Module.NuajDrivesSunAmbientColor, 70 ,"Change Nuaj' Drives Scene Ambient" );
				GUIHelpers.EndHorizontal();

				m_Module.Sun = GUIHelpers.SelectObject<GameObject>( new GUIContent( "Drive Sun", "The sun GameObject that can drive or be driven by Nuaj'" ), m_Module.Sun, "Select Nuaj' Drive Sun Light" );
				m_Module.SunHue = GUIHelpers.ColorBox( new GUIContent( "Sun Color", "Specifies the overall color of the Sun that will drive all the atmospheric effects" ), m_Module.SunHue, "Change Sun Color" );
				m_Module.SunIntensity = GUIHelpers.Slider( new GUIContent( "Sun Intensity", "Specifies the overall intensity of the Sun that will drive all the atmospheric effects" ), m_Module.SunIntensity, 0.0f, 20.0f, "Change Sun Intensity" );

				m_Module.RenderSoftwareEnvironment = GUIHelpers.CheckBox( new GUIContent( "Software Environment", "Tells if Nuaj' should render the environment map in hardware (more accurate but a bit slower) or software (doesn't take clouds into account but faster)" ), m_Module.RenderSoftwareEnvironment, "Change Environment Rendering" );

				UnIndent();
				GUIHelpers.Separate();
			}

			if ( GUIHelpers.FoldOut( ref m_bFoldOutWorld, "World Parameters" ) )
			{
				Indent();

				m_Module.WorldUnit2Kilometer = GUIHelpers.Slider( new GUIContent( "World Scale", "Sets the World scale that maps a World unit to a standard kilometer" ), m_Module.WorldUnit2Kilometer, 0.001f, 0.1f, "Change World Scale" );
				m_Module.PlanetRadiusKm = GUIHelpers.Slider( new GUIContent( "Planet Radius", "Sets the radius of the planet we're standing on.\n(in kilometers)" ), m_Module.PlanetRadiusKm, 1.0f, 10000.0f, "Change Planet Radius" );
				m_Module.PlanetAtmosphereAltitudeKm = GUIHelpers.Slider( new GUIContent( "Atmosphere Altitude", "Sets the altitude of the top atmosphere.\n(in kilometers)" ), m_Module.PlanetAtmosphereAltitudeKm, 1.0f, 200.0f, "Change Planet Radius" );

				GUIHelpers.Separate();
				m_Module.UpScaleTechnique = (NuajManager.UPSCALE_TECHNIQUE) GUIHelpers.ComboBox( new GUIContent( "UpScale Technique", "Changes the technique used to up-scale and refine the downscaled rendering" ), m_Module.UpScaleTechnique, "Change UpScale Technique" );
				using ( GUIHelpers.GUIEnabler( m_Module.UpScaleTechnique == NuajManager.UPSCALE_TECHNIQUE.ACCURATE ) )
				{
					m_Module.ZBufferDiscrepancyThreshold = GUIHelpers.Slider( new GUIContent( "ZBuffer Threshold", "Changes the threshold that helps to determine which pixels should be recomputed at full resolution\nNOTE: Be careful when dealing with dense foliage or meshes with many holes as each pixel around the holes will be recomputed at full resolution for clean refinement, incuring an increase in rendering time !" ), m_Module.ZBufferDiscrepancyThreshold, 0.02f, 200.0f, "Change ZBuffer Discrepancy Threshold" );
					m_Module.ShowZBufferDiscrepancies = GUIHelpers.CheckBox( new GUIContent( "Show ZBuffer Discrepancies", "Shows the ZBuffer discrepancies and highlights in red (sky) and green (clouds) the pixels that need to be recomputed at full resolution.\nThis is a helper for you to tweak the threshold nicely depending on the precision of your scene." ), m_Module.ShowZBufferDiscrepancies, "Change Show ZBuffer Discrepancies" );
				}

				UnIndent();
				GUIHelpers.Separate();
			}

			if ( GUIHelpers.FoldOut( ref m_bFoldOutShadowMap, "Shadow Map Parameters" ) )
			{
				Indent();

				m_Module.ShadowMapSize = GUIHelpers.SliderIntWithCheck( "MainShadowMapSize", new GUIContent( "Shadow Map Size", "Specifies the size of the shadow map" ), m_Module.ShadowMapSize, 64, 1024, "Change Shadow Map Size" );
				m_Module.ShadowDistanceFar = GUIHelpers.Slider( new GUIContent( "Shadow Far Distance", "Sets the the far clip distance for shadows." ), m_Module.ShadowDistanceFar, 0.0f, 10000.0f, "Change Shadow Far Distance" );

				bool	bCanUseCookie = m_Module.Sun != null && m_Module.Sun.light && m_Module.Sun.light.type == LightType.Directional;
				using ( GUIHelpers.GUIEnabler( bCanUseCookie ) )
				{
					if ( !bCanUseCookie )
						GUIHelpers.InfosArea( "You cannot use the shadow map as a light cookie for one of the following reasons :\n" +
							"	. There is no selected Drive Sun\n" +
							"	. The selected Drive Sun has no light component\n" +
							"	. The selected Drive Sun's light is not a directional light\n"
							, GUIHelpers.INFOS_AREA_TYPE.INFO );

					using ( GUIHelpers.GUIEnabler( m_Module.CastShadowUsingLightCookie = GUIHelpers.CheckBox( new GUIContent( "Use Light Cookie", "Tells if the shadow map should be rendered in a light cookie so the scene may be properly shadowed" ), m_Module.CastShadowUsingLightCookie, "Change Use Light Cookie" ) ) )
					{
						m_Module.LightCookieTextureSize = GUIHelpers.SliderIntWithCheck( "LightCookieTextureSize", new GUIContent( "Cookie Texture Size", "Specifies the size of the light cookie texture" ), m_Module.LightCookieTextureSize, 32, 512, "Change Cookie Texture Size" );
						m_Module.LightCookieSize = GUIHelpers.Slider( new GUIContent( "Light Cookie Size", "Specifies the size of the light cookie in WORLD units.\nNOTE: This is the SAME property as the \"light cookie size\" on directional lights but Unity doesn't provide any way of changing that property at the moment so I have to duplicate it here.\nIt's a bit annoying since you need to synchronize the 2 values both in here and in your directional light so they match." ), m_Module.LightCookieSize, 0.0f, 1000.0f, "Change Light Cookie Size" );
						using ( GUIHelpers.GUIEnabler( !(m_Module.LightCookieSampleAtCameraAltitude = GUIHelpers.CheckBox( new GUIContent( "Sample At Camera Altitude", "Tells if the light cookie should use camera's altitude to sample the shadow map\n(thus overriding the parameter below)" ), m_Module.LightCookieSampleAtCameraAltitude, "Change Sample at Camera Altitude" ) )) )
							m_Module.LightCookieSampleAltitudeKm = GUIHelpers.Slider( new GUIContent( "Cookie Sample Altitude", "Specifies the altitude (in kilometers) at which the light cookie should sample the shadow map.\nFor example, use 0 to shadow a scene standing on the ground (assuming the ground is at 0 altitude of course)." ), m_Module.LightCookieSampleAltitudeKm, -20.0f, 100.0f, "Change Light Cookie Sample Altitude" );
					}
				}

				UnIndent();
				GUIHelpers.Separate();
			}

			if ( GUIHelpers.FoldOut( ref m_bFoldOutLocalVariations, "Local Variations Parameters" ) )
			{
				Indent();

				// Select local cloud coverage
				GUIHelpers.BoldLabel( new GUIContent( "Local Cloud Coverage", "You can specify a Nuaj Map Locator GameObject that will locate and scale a map describing the local coverage of clouds.\nEach RGBA color component describes the coverage of a cloud layer ordered from bottom (Red) to top (Alpha) for each of the 4 possible layers.\nThe coverage value from each component is multiplied with the global cloud density to yield the final local density." ) );
				GameObject	ResultLocalCoverage = GUIHelpers.SelectObject<GameObject>( new GUIContent( "Locator", "The Nuaj Map Locator that will drive the local coverge map." ), m_Module.LocalCoverage, "Select Local Coverage" );
				if ( ResultLocalCoverage != null )
				{	// Ensure there is a NuajMapLocator component on the object !
					if ( ResultLocalCoverage.GetComponent<NuajMapLocator>() == null )
						GUIHelpers.MessageBox( "The provided GameObject has no NuajMapLocator component !\nYou need to select a MapLocator... (there is a NuajMapLocator prefab in the \"Prefabs\" folder)", "OK" );
					else
						m_Module.LocalCoverage = ResultLocalCoverage;
				}
				else
					m_Module.LocalCoverage = ResultLocalCoverage;

				GUIHelpers.Separate();

				// Select local emissive terrain
				GUIHelpers.BoldLabel( new GUIContent( "Local Emissive Terrain", "You can specify a Nuaj Map Locator GameObject that will locate and scale a map describing the local emissive color for the terrain.\nThis map contains the RGB color of the terrain (that can be useful to simulate city lights for example) while Alpha is used to modulate the terrain albedo set below (this can be useful to localy modify the terrain reflectance like over a stream of water for example)." ) );
				GameObject	ResultTerrainEmissive = GUIHelpers.SelectObject<GameObject>( new GUIContent( "Locator", "The Nuaj Map Locator that will drive the local emissive terrain map." ), m_Module.TerrainEmissive, "Select Local Terrain Emissive" );
				if ( ResultTerrainEmissive != null )
				{	// Ensure there is a NuajMapLocator component on the object !
					if ( ResultTerrainEmissive.GetComponent<NuajMapLocator>() == null )
						GUIHelpers.MessageBox( "The provided GameObject has no NuajMapLocator component !\nYou need to select a MapLocator... (there is a NuajMapLocator prefab in the \"Prefabs\" folder)", "OK" );
					else
						m_Module.TerrainEmissive = ResultTerrainEmissive;
				}
				else
					m_Module.TerrainEmissive = ResultTerrainEmissive;

				GUIHelpers.Separate();

				// Select terrain albedo
				m_Module.TerrainAlbedo = GUIHelpers.ColorBox( new GUIContent( "Terrain Albedo", "Sets the terrain albedo used to reflect the Sun & ambient sky on the clouds so they appear to be lit by underneath.\nA typical albedo is ~0.1 for soil or forest, about ~0.2 / ~0.3 for sand and desert and up to ~0.7 / ~0.8 for snow.\nYou can find interesting examples visiting http://en.wikipedia.org/wiki/Albedo.\nNOTE: Alpha is used as a multiplier to the whole RGB color." ), m_Module.TerrainAlbedo, "Change Terrain Albedo" );

				UnIndent();
				GUIHelpers.Separate();
			}

			if ( GUIHelpers.FoldOut( ref m_bFoldOutLightning, "Lightning Parameters" ) )
			{
				Indent();

				// Select first lightning bolt
				GUIHelpers.BoldLabel( new GUIContent( "1st Lightning Bolt", "You can specify a Nuaj Lightning Bolt GameObject that will locate lightning for clouds." ) );
				GameObject	ResultLightningBolt = GUIHelpers.SelectObject<GameObject>( new GUIContent( "Lightning Bolt", "The first lightning bolt." ), m_Module.LightningBolt0, "Select 1st Lightning Bolt" );
				if ( ResultLightningBolt != null )
				{	// Ensure there is a NuajMapLocator component on the object !
					if ( ResultLightningBolt.GetComponent<NuajLightningBolt>() == null )
						GUIHelpers.MessageBox( "The provided GameObject has no NuajLighthningBolt component !\nYou need to select a LightningBolt... (there is a NuajLightningBolt prefab in the \"Prefabs\" folder)", "OK" );
					else
						m_Module.LightningBolt0 = ResultLightningBolt;
				}
				else
					m_Module.LightningBolt0 = ResultLightningBolt;

				GUIHelpers.Separate();

				// Select second lightning bolt
				GUIHelpers.BoldLabel( new GUIContent( "2nd Lightning Bolt", "You can specify a second Nuaj Lightning Bolt GameObject that will locate lightning for clouds." ) );
				ResultLightningBolt = GUIHelpers.SelectObject<GameObject>( new GUIContent( "Lightning Bolt", "The second lightning bolt." ), m_Module.LightningBolt1, "Select 2nd Lightning Bolt" );
				if ( ResultLightningBolt != null )
				{	// Ensure there is a NuajMapLocator component on the object !
					if ( ResultLightningBolt.GetComponent<NuajLightningBolt>() == null )
						GUIHelpers.MessageBox( "The provided GameObject has no NuajLighthningBolt component !\nYou need to select a LightningBolt... (there is a NuajLightningBolt prefab in the \"Prefabs\" folder)", "OK" );
					else
						m_Module.LightningBolt1 = ResultLightningBolt;
				}
				else
					m_Module.LightningBolt1 = ResultLightningBolt;

				UnIndent();
				GUIHelpers.Separate();
			}

			if ( GUIHelpers.FoldOut( ref m_bFoldOutLuminanceAdaptation, "Luminance Adaptation" ) )
			{
				Indent();

				m_Module.LuminanceComputationType = (NuajManager.LUMINANCE_COMPUTATION_TYPE) GUIHelpers.ComboBox( new GUIContent( "Computation Type", "Specifies the algorithm to use to compute the image luminance.\nDownscale is the default and most appropriate choice but is quite time consuming.\nYou can also either force the scene luminance to 1 or to a value you can setup yourself." ), m_Module.LuminanceComputationType, "Change Luminance Computation Type" );
				using ( GUIHelpers.GUIEnabler( m_Module.LuminanceComputationType == NuajManager.LUMINANCE_COMPUTATION_TYPE.DOWNSCALE || m_Module.LuminanceComputationType == NuajManager.LUMINANCE_COMPUTATION_TYPE.DOWNSCALE_LOG ) )
					m_Module.LuminanceAverageOrMax = GUIHelpers.Slider( new GUIContent( "Average or Max ?", "Specifies if we want to use the average (0) or maximum (1) scene luminance for the tone mapping" ), m_Module.LuminanceAverageOrMax, 0.0f, 1.0f, "Change Luminance Avg/Max" );
				m_Module.SceneIsHDR = GUIHelpers.CheckBox( new GUIContent( "Scene in HDR", "Check if your scene was already rendered in HDR and doesn't need some feng-shui computations to make it \"look like\" HDR..." ), m_Module.SceneIsHDR, "Change HDR Scene" );
				using ( GUIHelpers.GUIEnabler( !m_Module.SceneIsHDR ) )
					m_Module.SceneLuminanceCorrection = GUIHelpers.Slider( new GUIContent( "Scene Luma Correction", "Drives the correction factor on input scene luminance used in fake HDR scene reconstruction." ), m_Module.SceneLuminanceCorrection, 0.0f, 2.0f, "Change Scene Luminance Correction" );
				GUIHelpers.Separate();

				// Day/Night adaptation
				GUIHelpers.BoldLabel( new GUIContent( "Day Time", "" ) );
				m_Module.ToneMappingMinLuminanceAtDay = GUIHelpers.Slider( new GUIContent( "Min Luminance", "Specifies the minimum level of adaptable luminance during daytime.\r\nThis should be about 1/10 of the Sun's intensity but not 0." ), m_Module.ToneMappingMinLuminanceAtDay, 0.0f, 10.0f, "Change Min Luminance Day" );
				m_Module.ToneMappingMaxLuminanceAtDay = GUIHelpers.Slider( new GUIContent( "Max Luminance", "Specifies the maximum level of adaptable luminance during daytime.\r\nThis should be a bit less than the Sun's intensity." ), m_Module.ToneMappingMaxLuminanceAtDay, 0.0f, 10.0f, "Change Max Luminance Day" );
				m_Module.ToneMappingAdaptationSpeedAtDay = GUIHelpers.Slider( new GUIContent( "Adaptation Speed", "Specifies the speed of camera adaptation to high luminance levels during daytime.\r\n0 is very slow, 1 is instantaneous." ), m_Module.ToneMappingAdaptationSpeedAtDay, 0.0f, 1.0f, "Change Adapatation Speed Day" );

				GUIHelpers.Separate();

				GUIHelpers.BoldLabel( new GUIContent( "Night Time", "" ) );
				m_Module.ToneMappingMinLuminanceAtNight = GUIHelpers.Slider( new GUIContent( "Min Luminance", "Specifies the minimum level of adaptable luminance during nighttime.\r\nThis should be about 1/100 of the Sun's intensity but not 0." ), m_Module.ToneMappingMinLuminanceAtNight, 0.0f, 5.0f, "Change Min Luminance Night" );
				m_Module.ToneMappingMaxLuminanceAtNight = GUIHelpers.Slider( new GUIContent( "Max Luminance", "Specifies the maximum level of adaptable luminance during nighttime.\r\nThis should be a bit less than the Sun's intensity." ), m_Module.ToneMappingMaxLuminanceAtNight, 0.0f, 5.0f, "Change Max Luminance Day" );
				m_Module.ToneMappingAdaptationSpeedAtNight = GUIHelpers.Slider( new GUIContent( "Adaptation Speed", "Specifies the speed of camera adaptation to high luminance levels during nighttime.\r\n0 is very slow, 1 is instantaneous." ), m_Module.ToneMappingAdaptationSpeedAtNight, 0.0f, 1.0f, "Change Adapatation Speed Night" );

				UnIndent();
				GUIHelpers.Separate();
			}

			if ( GUIHelpers.FoldOut( ref m_bFoldOutToneMapping, "Tone Mapping" ) )
			{
				Indent();

				m_Module.ToneMappingType = (NuajManager.TONE_MAPPING_TYPE) GUIHelpers.ComboBox( new GUIContent( "Tone Mapping Type", "Specifies the algorithm to use to tone map the image." ), m_Module.ToneMappingType, "Change Tone Mapping Type" );

				Indent();
				switch ( m_Module.ToneMappingType )
				{
					case NuajManager.TONE_MAPPING_TYPE.REINHARD:
						m_Module.ToneMappingParamsReinhard.WhiteLuminance = GUIHelpers.Slider( new GUIContent( "White Luminance", "Specifies the intensity of the white point in the scene. A factor to the average scene luminance." ), m_Module.ToneMappingParamsReinhard.WhiteLuminance, 0.0f, 1.0f, "Change Tone Mapping Parameter" );
						break;
					case NuajManager.TONE_MAPPING_TYPE.DRAGO:
						m_Module.ToneMappingParamsDrago.MaxDisplayLuminance = GUIHelpers.Slider( new GUIContent( "Max Display Luminance", "Specifies the maximum luminance the screen can display.\r\nNominal value = 50" ), m_Module.ToneMappingParamsDrago.MaxDisplayLuminance, 0.0f, 200.0f, "Change Tone Mapping Parameter" );
						m_Module.ToneMappingParamsDrago.Bias = GUIHelpers.Slider( new GUIContent( "Bias", "Specifies the luminance bias.\r\nNominal value = 0.85" ), m_Module.ToneMappingParamsDrago.Bias, 0.0f, 1.0f, "Change Tone Mapping Parameter" );
						break;
					case NuajManager.TONE_MAPPING_TYPE.FILMIC:
						m_Module.ToneMappingParamsFilmic.W = GUIHelpers.Slider( new GUIContent( "White Point", "Specifies the intensity of the white point." ), m_Module.ToneMappingParamsFilmic.W, 0.01f, 0.2f, "Change Tone Mapping Parameter" );
						break;
					case NuajManager.TONE_MAPPING_TYPE.EXPONENTIAL:
						m_Module.ToneMappingParamsExponential.Exposure = GUIHelpers.Slider( new GUIContent( "Exposure", "Specifies the scene exposure." ), m_Module.ToneMappingParamsExponential.Exposure, 0.0f, 2.0f, "Change Tone Mapping Parameter" );
						m_Module.ToneMappingParamsExponential.Gain = GUIHelpers.Slider( new GUIContent( "Exposure Gain", "Specifies the multiplier after exposition." ), m_Module.ToneMappingParamsExponential.Gain, 0.0f, 4.0f, "Change Tone Mapping Parameter" );
						break;
					case NuajManager.TONE_MAPPING_TYPE.LINEAR:
						m_Module.ToneMappingParamsLinear.Factor = GUIHelpers.Slider( new GUIContent( "Linear Factor", "Specifies the linear factor to apply." ), m_Module.ToneMappingParamsLinear.Factor, 0.0f, 50.0f, "Change Tone Mapping Parameter" );
						break;
				}
				UnIndent();
				GUIHelpers.Separate();

				m_Module.ToneMappingGammaHighlights = GUIHelpers.Slider( new GUIContent( "Gamma Correction", "Specifies the gamma correction to apply to the luminance." ), m_Module.ToneMappingGammaHighlights, 0.0f, 4.0f, "Change Tone Mapping Gamma" );
				GUIHelpers.Separate();

				m_Module.UnitySunColorFactor = GUIHelpers.Slider( new GUIContent( "Sun Color Factor", "Specifies the factor to apply to the tone mapped Sun color to make it a Unity LDR color." ), m_Module.UnitySunColorFactor, 0.0f, 4.0f, "Change Sun Color Factor" );
				m_Module.UnityAmbientColorFactor = GUIHelpers.Slider( new GUIContent( "Ambient Color Factor", "Specifies the factor to apply to the tone mapped Sky color to make it a Unity LDR ambient color." ), m_Module.UnityAmbientColorFactor, 0.0f, 4.0f, "Change Ambient Color Factor" );

				UnIndent();
			}

			if ( GUIHelpers.FoldOut( ref m_bFoldOutGlowSupport, "Glow Support" ) )
			{
				Indent();

				m_Module.EnableGlowSupport = GUIHelpers.CheckBox( new GUIContent( "Enable Glow Support", "Enables or disables the writing of alpha values for the Glow image effect." ), m_Module.EnableGlowSupport, "Change Glow Support" );
				m_Module.GlowCombineAlphas = GUIHelpers.CheckBox( new GUIContent( "Combine Glow Alphas", "If true, the written alpha will be the maximum of your scene's alpha and Nuaj' alpha.\nIf false, the written alpha will be Nuaj' alpha." ), m_Module.GlowCombineAlphas, "Change Glow Combine Alphas" );
				m_Module.GlowIntensityThresholdMin = GUIHelpers.Slider( new GUIContent( "MIN Intensity", "Changes the intensity at which the glow starts to operate" ), m_Module.GlowIntensityThresholdMin, 0.0f, 4.0f, "Change Glow Min Intensity Threshold" );
				m_Module.GlowIntensityThresholdMax = GUIHelpers.Slider( new GUIContent( "MAX Intensity", "Changes the intensity at which the glow is at its full" ), m_Module.GlowIntensityThresholdMax, 0.0f, 4.0f, "Change Glow Max Intensity Threshold" );

				UnIndent();
			}


			GUIHelpers.Separate( 20 );
			if ( this.m_Module != null && GUIHelpers.Button( new GUIContent( "Render to CubeMap", "Spawns the Render to Cube Map dialog" ) ) )
			{	// Show the dialog
				CubeMapRendererWindow	W = EditorWindow.GetWindow<CubeMapRendererWindow>( true, "Nuaj' Cube Map Renderer", true );
				W.Manager = this.m_Module;
				W.Show();
			}

//			m_Module.CPUReadBackFramesInterval = GUIHelpers.SliderInt( new GUIContent( "CPU Readback Interval", "Changes the frames interval for CPU readback" ), m_Module.CPUReadBackFramesInterval, 1, 20, "Change CPU Readback Interval" );
		}

		protected new void	ShowErrorState()
		{
			GUIHelpers.Separate();
			GUIHelpers.InfosArea( "Nuaj' is in error state and cannot work at the moment... The reason is :\n\n" + m_Module.Error, GUIHelpers.INFOS_AREA_TYPE.ERROR );
		}

		protected new void	ShowWarningState()
		{
			GUIHelpers.Separate();
			GUIHelpers.InfosArea( "The module is in warning state and may not render properly at the moment... The reason is :\n\n" + m_Module.Warning, GUIHelpers.INFOS_AREA_TYPE.WARNING );
		}

		#endregion
	}
}