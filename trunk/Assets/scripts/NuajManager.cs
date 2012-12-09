#define USE_CPU_READBACK_TRIPLE_BUFFER	// Uses a triple buffer with a 2 frames delay before accessing a texture by CPU... But it doesn't seem to work anyway... Better safe than sorry though

using System;
using System.Collections.Generic;
using UnityEngine;

using Nuaj;

/// <summary>
/// Nuaj' Manager is the main component of the Nuaj' atmospheric system.
/// It represents the API of the system through which you can access all specific modules at runtime
/// </summary>
[ExecuteInEditMode]
public class NuajManager : MonoBehaviour, IComparer<ICloudLayer>
{
	#region CONSTANTS

	// World constants
	protected const float				WORLD_UNIT_TO_KILOMETER = 0.01f;	// 1 World Unit equals XXX kilometers
	protected const float				EARTH_RADIUS = 6400.0f;				// Earth radius (in kilometers)
	protected const float				ATMOSPHERE_ALTITUDE = 100.0f;		// Altitude of the top atmosphere (in kilometers)

	// Default parameters
	protected const int					DEFAULT_SHADOW_MAP_SIZE = 512;
	protected const int					DEFAULT_LIGHT_COOKIE_SIZE = 128;
	protected const int					NOISE3D_TEXTURE_POT = 4;
	protected const int					NOISE3D_TEXTURE_SIZE = 1 << NOISE3D_TEXTURE_POT;
	protected const int					NOISE2D_TEXTURE_POT = 8;
	internal const int					NOISE2D_TEXTURE_SIZE = 1 << NOISE2D_TEXTURE_POT;

	// Luminance adaptation
	internal const float				MIN_LUMINANCE_AT_DAY = 0.1f;		// Minimum luminance we can adapt during day time
	internal const float				MAX_LUMINANCE_AT_DAY = 2.5f;		// Maximum luminance we can adapt during day time
	internal const float				MIN_LUMINANCE_AT_NIGHT = 0.02f;		// Minimum luminance we can adapt during night time
	internal const float				MAX_LUMINANCE_AT_NIGHT = 1.0f;		// Maximum luminance we can adapt during night time
	internal const float				LUMINANCE_ADAPTATION_SPEED_AT_DAY = 0.7f;	// Adaptation speed during day time
	internal const float				LUMINANCE_ADAPTATION_SPEED_AT_NIGHT = 0.5f * LUMINANCE_ADAPTATION_SPEED_AT_DAY;	// Adaptation speed during night time

	internal static readonly Vector3	LUMINANCE = new Vector3( 0.2126f, 0.7152f, 0.0722f );	// RGB => Y (taken from http://wiki.gamedev.net/index.php/D3DBook:High-Dynamic_Range_Rendering#Light_Adaptation)
	internal const int					ENVIRONMENT_TEXTURE_SIZE_POT = 4;	// Use a 32x16 rendering for sky environment

	protected const int					MAX_ALLOWED_LAYERS	= 4;			// We can't render more than 4 cloud layers at a time (no need to change that for higher values, this will only make the manager crash !)

	protected const int					CPU_READBACK_COUNT = 3;				// We need to readback at most 3 values : luminance, sun color & sky color

	#endregion

	#region NESTED TYPES

	/// <summary>
	/// The various supported tone mapping schemes
	/// </summary>
	public enum		TONE_MAPPING_TYPE
	{
		/// <summary>
		/// Filmic tone mapping applies a S-curve to the image luminance to attenuate highlights and increase shadows' contrast
		/// </summary>
		FILMIC,

		/// <summary>
		/// Drago tone mapping applies a logarithmic curve to the image luminance
		/// </summary>
		DRAGO,

		/// <summary>
		/// Reinhard tone mapping applies an inverse curve to the image luminance
		/// </summary>
		REINHARD,

		/// <summary>
		/// Linear applies a linear curve to the image luminance
		/// </summary>
		LINEAR,

		/// <summary>
		/// Exponential applies an exponential curve to the image luminance
		/// </summary>
		EXPONENTIAL,

		/// <summary>
		/// No tone mapping is applied : the output color equals the input color
		/// </summary>
		DISABLED,
	}

	/// <summary>
	/// The various luminance computation schemes
	/// </summary>
	public enum		LUMINANCE_COMPUTATION_TYPE
	{
		/// <summary>
		/// Downscales the scene's luminance into a single pixel used to tone-map the image
		/// This is the most accurate and automated process but also the slowest
		/// </summary>
		DOWNSCALE,

		/// <summary>
		/// LOG-Downscales the scene's luminance into a single pixel used to tone-map the image
		/// This is the most accurate and automated process but also the slowest
		/// The "log" part here is simply that we take the log of the luminance instead of the linear luminance.
		/// This is important when large luminance ranges (like 10000 for daylight and 0.001 during nighttime) are used.
		/// </summary>
		DOWNSCALE_LOG,

		/// <summary>
		/// Uses a constant luminance of 1
		/// Fast and painless but not accurate
		/// </summary>
		ONE,

		/// <summary>
		/// Uses a custom value set by the user
		/// </summary>
		CUSTOM,
	}

	/// <summary>
	/// This describes the various upscale techniques that can be used to refine downscaled rendering
	/// </summary>
	public enum		UPSCALE_TECHNIQUE
	{
		/// <summary>
		/// Refines areas with strong discrepancies at the cost of recomputing additional pixels
		/// This is the best method but also the most time consuming if there are many jagged edges, like with vegetation or watching the clouds through grating
		/// </summary>
		ACCURATE,

		/// <summary>
		/// This method attempts to retrieve the most appropriate color without recomputing new values
		/// </summary>
		SMART,

		/// <summary>
		/// Simple bilinear interpolation, this is the cheapest method but it will show unwanted square artefacts at edges
		/// </summary>
		BILINEAR,
	}

	/// <summary>
	/// Use this delegate to perform your own custom environment Sky & Sun rendering
	/// </summary>
	/// <param name="_Sender"></param>
	/// <param name="_SunColor">The environment Sun color (HDR!) that will be fed to Unity's directional Sun light</param>
	/// <param name="_SkyColor">The environment Sky color (HDR!) taht will be fed to Unity's ambient color</param>
	/// <example>You can find an example of an existing environment renderer in ModulePerspective.RenderEnvironmentSoftware()</example>
	public delegate void	CustomEnvironmentRenderingEventHandler( NuajManager _Sender, out Vector3 _SunColor, out Vector3 _SkyColor );

	/// <summary>
	/// Use this delegate to perform custom luminance mapping
	/// </summary>
	/// <param name="_Sender"></param>
	/// <param name="_LastFrameLuminance">The scene's luminance at last frame</param>
	/// <param name="_CurrentFrameLuminance">The scene's target luminance at current frame</param>
	/// <returns>The RGB "luminance" to use to tone map the scene</returns>
	public delegate Vector3	CustomLuminanceAdaptationEventHandler( NuajManager _Sender, Vector3 _LastFrameLuminance, float _CurrentFrameLuminance );

	/// <summary>
	/// Use this delegate to perform custom sky composition
	/// </summary>
	/// <param name="_Layers">The cloud layers from lowest to highest (up to 4 layers)</param>
	/// <param name="_ShadowMap">The shadow map used for godrays. Each channel of the RGBA shadow map indicates the amount of shadowing for each of the 4 layers (R is lowest layer and A is highest)</param>
	/// <param name="_Background">The background image consisting of satellites</param>
	public delegate void	CustomSkyCompositionEventHandler( ICloudLayer[] _Layers, Texture _ShadowMap, Texture _Background );

	/// <summary>
	/// Use this delegate to perform custom background clear (if not used, the background is cleared to black by default)
	/// </summary>
	/// <param name="_BackgroundToClear">The background image where satellites will be rendered</param>
	public delegate void	CustomBackgroundClearEventHandler( RenderTexture _BackgroundToClear );

	/// <summary>
	/// Use this delegate to perform custom background rendering
	/// </summary>
	/// <param name="_CurrentBackground">The current background image where satellites have already been rendered.</param>
	/// <returns>A new texture to use as background</returns>
	public delegate Texture	CustomBackgroundRenderEventHandler( RenderTexture _CurrentBackground );

	/// <summary>
	/// This describes the parameters used by the Filmic tone mapping algorithm (http://filmicgames.com/archives/75)
	/// </summary>
	[Serializable]
	public class	ToneMappingParameters_Filmic
	{
		public float	A = 0.15f;	// A = Shoulder Strength
		public float	B = 0.50f;	// B = Linear Strength
		public float	C = 0.10f;	// C = Linear Angle
		public float	D = 0.20f;	// D = Toe Strength
		public float	E = 0.02f;	// E = Toe Numerator
		public float	F = 0.30f;	// F = Toe Denominator
									// (Note: E/F = Toe Angle)
		public float	W = 0.125f;	// LinearWhite = Linear White Point Value

		[NonSerialized]
		public float	MiddleGrey;	// Internally computed by Nuaj
	}

	/// <summary>
	/// This describes the parameters used by the Drago (log) tone mapping algorithm (http://citeseer.ist.psu.edu/viewdoc/summary?doi=10.1.1.10.7814)
	/// </summary>
	[Serializable]
	public class	ToneMappingParameters_Drago
	{
		public float	MaxDisplayLuminance = 80.0f;
		public float	Bias = 0.85f;
	}

	/// <summary>
	/// This describes the parameters used by the Reinhard tone mapping algorithm (http://www.cs.ucf.edu/~reinhard/cdrom/)
	/// </summary>
	[Serializable]
	public class	ToneMappingParameters_Reinhard
	{
		public float	WhiteLuminance = 0.1f;
		[NonSerialized]
		public float	MiddleGrey;	// Internally computed by Nuaj
	}

	/// <summary>
	/// This describes the parameters used by the Linear tone mapping algorithm
	/// </summary>
	[Serializable]
	public class	ToneMappingParameters_Linear
	{
		public float	Factor = 10.0f;
		[NonSerialized]
		public float	MiddleGrey;	// Internally computed by Nuaj
	}

	/// <summary>
	/// This describes the parameters used by the Exponential tone mapping algorithm (http://megapov.inetart.net/manual-1.2/global_settings.html)
	/// </summary>
	[Serializable]
	public class	ToneMappingParameters_Exponential
	{
		public float	Exposure = 0.25f;
		public float	Gain = 3.5f;
	}

	#endregion

	#region FIELDS

	/////////////////////////////////////////////////////////
	// General serializable parameters
	[SerializeField] protected GameObject				m_Camera = null;

	// World
	[SerializeField] protected float					m_WorldUnit2Kilometer = WORLD_UNIT_TO_KILOMETER;
	[SerializeField] protected Vector3					m_PlanetCenterKm = -EARTH_RADIUS * Vector3.up;	// By default, we're on the surface so the center is 6400 Kms below us...
	[SerializeField] protected Vector3					m_PlanetNormal = Vector3.up;					// This is the normal to the planet where the camera is standing
	[SerializeField] protected float					m_PlanetRadiusKm = EARTH_RADIUS;
	[SerializeField] protected float					m_PlanetAtmosphereAltitudeKm = ATMOSPHERE_ALTITUDE;
	[SerializeField] protected float					m_ZBufferDiscrepancyThreshold = 50.0f;
	[SerializeField] protected UPSCALE_TECHNIQUE		m_UpScaleTechnique = UPSCALE_TECHNIQUE.ACCURATE;
	[SerializeField] protected bool						m_bShowZBufferDiscrepancies = false;

	// Sun
	[SerializeField] protected GameObject				m_Sun = null;
	[SerializeField] protected Vector3					m_SunDirection = Vector3.up;
	[SerializeField] protected float					m_SunPhi = 0.0f;
	[SerializeField] protected float					m_SunTheta = 0.0f;
	[SerializeField] protected bool						m_bSunDrivenDirection = true;
	[SerializeField] protected bool						m_bSunDrivenDirectionalColor = true;
	[SerializeField] protected bool						m_bSunDrivenAmbientColor = true;
	[SerializeField] protected Color					m_SunHue = Color.white;
	[SerializeField] protected float					m_SunIntensity = 10.0f;
	[SerializeField] protected bool						m_bRenderSoftwareEnvironment = false;

	// Shadows
	[SerializeField] protected int						m_ShadowMapSize = DEFAULT_SHADOW_MAP_SIZE;
	[SerializeField] protected float					m_ShadowDistanceFar = 5000.0f;
	[SerializeField] protected bool						m_bCastShadowUsingLightCookie = true;
	[SerializeField] protected int						m_LightCookieTextureSize = DEFAULT_LIGHT_COOKIE_SIZE;
	[SerializeField] protected float					m_LightCookieSize = 500.0f;
	[SerializeField] protected bool						m_bLightCookieSampleAtCameraAltitude = true;
	[SerializeField] protected float					m_LightCookieSampleAltitudeKm = 0.0f;

	// Lightning
	// We allow only 2 lighting bolts at the same time. That's how it is.
	[SerializeField] protected GameObject				m_LightningBolt0 = null;
	[SerializeField] protected GameObject				m_LightningBolt1 = null;

	// Local variations
	[SerializeField] protected GameObject				m_LocalCoverage = null;
	[SerializeField] protected GameObject				m_TerrainEmissive = null;
	[SerializeField] protected Color					m_TerrainAlbedo = new Color( 74.0f, 48.0f, 32.0f, 127.0f ) / 255.0f;

	// Tone mapping
	[SerializeField] protected TONE_MAPPING_TYPE			m_ToneMappingType = TONE_MAPPING_TYPE.FILMIC;
	[SerializeField] protected LUMINANCE_COMPUTATION_TYPE	m_LuminanceComputationType = LUMINANCE_COMPUTATION_TYPE.DOWNSCALE;
	[SerializeField] protected float					m_LuminanceAverageOrMax = 1.0f;
	[SerializeField] protected bool						m_bSceneIsHDR = false;
	[SerializeField] protected float					m_SceneLuminanceCorrection = 0.4f;
	[SerializeField] protected float					m_ToneMappingGammaShadows = 1.5f;
	[SerializeField] protected float					m_ToneMappingGammaHighlights = 2.2f;
	[SerializeField] protected float					m_ToneMappingGammaBoundary = 0.0f;// 0.1f;
	[SerializeField] protected float					m_ToneMappingBoostFactor = 1.0f;

	// Luminance adaptation
	[SerializeField] protected float					m_ToneMappingMinLuminanceAtDay = MIN_LUMINANCE_AT_DAY;
	[SerializeField] protected float					m_ToneMappingMaxLuminanceAtDay = MAX_LUMINANCE_AT_DAY;
	[SerializeField] protected float					m_ToneMappingAdaptationSpeedAtDay = LUMINANCE_ADAPTATION_SPEED_AT_DAY;
	[SerializeField] protected float					m_ToneMappingMinLuminanceAtNight = MIN_LUMINANCE_AT_NIGHT;
	[SerializeField] protected float					m_ToneMappingMaxLuminanceAtNight = MAX_LUMINANCE_AT_NIGHT;
	[SerializeField] protected float					m_ToneMappingAdaptationSpeedAtNight = LUMINANCE_ADAPTATION_SPEED_AT_NIGHT;

	[SerializeField] protected ToneMappingParameters_Reinhard		m_ToneMappingParamsReinhard = new ToneMappingParameters_Reinhard();
	[SerializeField] protected ToneMappingParameters_Drago			m_ToneMappingParamsDrago = new ToneMappingParameters_Drago();
	[SerializeField] protected ToneMappingParameters_Filmic			m_ToneMappingParamsFilmic = new ToneMappingParameters_Filmic();
	[SerializeField] protected ToneMappingParameters_Exponential	m_ToneMappingParamsExponential = new ToneMappingParameters_Exponential();
	[SerializeField] protected ToneMappingParameters_Linear			m_ToneMappingParamsLinear = new ToneMappingParameters_Linear();

	[SerializeField] protected float					m_UnitySunColorFactor = 0.5f;
	[SerializeField] protected float					m_UnityAmbientColorFactor = 0.4f;

	// Glow Support
	[SerializeField] protected bool						m_bEnableGlowSupport = false;
	[SerializeField] protected bool						m_bCombineAlphas = false;
	[SerializeField] protected Vector2					m_GlowIntensityThreshold = new Vector2( 0.75f, 1.4f );

	// Technical
	[SerializeField] protected int						m_CPUReadBackFramesInterval = 0;


	/////////////////////////////////////////////////////////
	// The available modules
	[SerializeField] protected ModulePerspective	m_ModulePerspective = new ModulePerspective( "Aerial Perspective" );
	[SerializeField] protected ModuleCloudLayer		m_ModuleCloudLayer = new ModuleCloudLayer( "Cloud Layer" );
	[SerializeField] protected ModuleCloudVolume	m_ModuleCloudVolume = new ModuleCloudVolume( "Volume Clouds" );
	[SerializeField] protected ModuleSatellites		m_ModuleSatellites = new ModuleSatellites( "Satellites" );
	protected ModuleBase[]				m_Modules = null;


	/////////////////////////////////////////////////////////
	// Materials
	protected NuajMaterial				m_MaterialCompose = null;
	protected NuajMaterial				m_MaterialClearTexture = null;
	protected NuajMaterial				m_MaterialRenderLightCookie = null;
	protected NuajMaterial				m_MaterialDownScaleZBuffer = null;
	protected ImageScaler				m_ImageScaler = new ImageScaler();

	/////////////////////////////////////////////////////////
	// Textures & Targets
	protected RenderTexture				m_RTScattering = null;
	protected RenderTexture				m_RTShadowMap = null;
	protected RenderTexture				m_RTBackground = null;
	protected RenderTexture				m_RTBackgroundEnvironment = null;
	protected RenderTexture				m_RTLightCookie = null;
	protected RenderTexture				m_RTAmbientEnvMapSky = null;
	protected RenderTexture				m_RTAmbientEnvMapSun = null;

	// Default internal textures
	internal NuajTexture2D				m_TextureEmptyCloud = null;
	internal NuajTexture2D				m_TextureWhite = null;
	internal NuajTexture2D				m_TextureBlack = null;
	internal NuajTexture2D[]			m_TextureNoise3D = null;
	internal NuajTexture2D				m_TextureNoise2D = null;
	protected RenderTexture[]			m_GPU2CPURenderTextures = new RenderTexture[3];
	protected NuajTexture2D				m_CPUReadableTexture = null;
	protected Color[]					m_CPUReadBack = null;

	/////////////////////////////////////////////////////////
	// Camera Effect
	protected EffectComposeAtmosphere	m_CameraEffectComposeAtmosphere = null;

	/////////////////////////////////////////////////////////
	// Internal parameters
	protected bool						m_bInternalDataAreValid = false;

	protected int						m_ScreenWidth = 0;
	protected int						m_ScreenHeight = 0;

	// Cached Sun data
	protected Matrix4x4					m_Sun2World = Matrix4x4.identity;
	protected Matrix4x4					m_World2Sun = Matrix4x4.identity;
	protected Vector3					m_SunColor = Vector3.one;	// Cached color = Intensity * Hue
	protected Vector3					m_AmbientNightSky = Vector3.zero;

	// Cached luminance data for tone mapping
	protected float						m_ImageLuminance = 0.0f;
	protected Vector3					m_PreviousFrameLuminance = Vector3.zero;
	protected Vector3					m_CurrentAdaptationLuminance = Vector3.one;

	// Cached camera data
	protected Vector4					m_CameraData;
	protected Matrix4x4					m_Camera2World;
	protected Matrix4x4					m_World2Camera;

	// Cached planet data
	protected Vector3					m_PlanetTangent = Vector3.zero;
	protected Vector3					m_PlanetBiTangent = Vector3.zero;
	protected float						m_Kilometer2WorldUnit = 0.0f;

	// Cached local variations data
	protected NuajTexture2D				m_LocalCoverageTexture = new NuajTexture2D();
	protected NuajTexture2D				m_TerrainEmissiveTexture = new NuajTexture2D();

	// Cached shadow map data
	protected Vector4					m_ShadowMapAngularBounds = Vector4.zero;
	protected Vector4					m_ShadowMapInvAngularBounds = Vector4.zero;
	protected Vector4					m_ShadowMapAltitudesMinKm = Vector4.zero;	// The minimum altitudes for the 4 cloud layers
	protected Vector4					m_ShadowMapAltitudesMaxKm = Vector4.zero;	// The maximum altitudes for the 4 cloud layers
	protected Matrix4x4					m_ShadowMap2World;
	protected Matrix4x4					m_World2ShadowMap;

	// Cached 3D Noise data
	protected float						m_Noise3DSumValues = 0.0f;				// The sum of noise values in the entire noise texture
	protected Vector3[]					m_Noise3DValuesProbabilities = null;	// The probabilities for values above 0.25, 0.5 and 0.75

	// Cached CPU-readable data
	protected int						m_WrittenCPUDataCount = 0;				// The amount of written data to be read back by the CPU. Updated each frame. If 0, no read-back is performed which saves a lot of time !
	protected int						m_CPUReadBackFramesCount = 0;

	// Error & Warning states
	protected bool						m_bInErrorState = false;
	protected string					m_Error = "";
	protected bool						m_bInWarningState = false;
	protected string					m_Warning = "";

	#endregion

	#region PROPERTIES

	/// <summary>
	/// Gets or sets the camera that will receive the atmospheric effects
	/// </summary>
	public GameObject				Camera
	{
		get { return m_Camera; }
		set
		{
			if ( value == m_Camera )
				return;
			if ( value != null && !value.GetComponent<Camera>() )
			{	// Not a camera !
				Nuaj.Help.LogError( "The GameObject assigned as Camera has no Camera component !" ); 
				value = null;
			}

			// Destroy image effect
			DestroyCameraEffect();

			m_Camera = value;

			// Initialize image effect
			CreateOrAttachCameraEffect();

			// Notify
			if ( CameraChanged != null )
				CameraChanged( this, EventArgs.Empty );
		}
	}

	/// <summary>
	/// Gets the camera's altitude in kilometers
	/// </summary>
	public float					CameraAltitudeKm
	{
		get
		{
			if ( m_Camera == null )
				return 0.0f;

			Vector3	CameraPositionKm = m_WorldUnit2Kilometer * (Vector3) m_Camera2World.GetColumn( 3 );	// Position in kilometers
			return Vector3.Magnitude( CameraPositionKm - m_PlanetCenterKm ) - m_PlanetRadiusKm;
		}
	}

	#region Sun Parameters

	/// <summary>
	/// Gets or sets the Sun object whose transform's Z axis will dictate the Sun's direction.
	/// (NOTE: this is a vector pointing TOWARD the Sun)
	/// </summary>
	public GameObject				Sun
	{
		get { return m_Sun; }
		set
		{
			if ( value == m_Sun )
				return;

			if ( m_Sun != null )
			{	// Un-subscribe from previous Sun
				SunDirection = Vector3.up;

				if ( m_Sun.light != null )
					m_Sun.light.cookie = null;
			}

			m_Sun = value;

			if ( m_Sun != null )
			{	// Subscribe to new Sun
				SunDirection = m_Sun.transform.up;

				if ( m_Sun.light != null )
					m_Sun.light.cookie = m_RTLightCookie;
			}

			// Notify
			if ( SunChanged != null )
				SunChanged( this, EventArgs.Empty );
		}
	}

	/// <summary>
	/// Gets or sets the Sun's direction in WORLD space.
	/// (NOTE: this is a vector pointing TOWARD the Sun)
	/// </summary>
	public Vector3					SunDirection
	{
		get { return m_SunDirection; }
		set
		{
			if ( value.sqrMagnitude < 1e-6f )
				value = Vector3.up;
			else
				value = value.normalized;

			m_SunDirection = value;

			// Compute SUN => WORLD transform
			m_Sun2World = Matrix4x4.identity;

			Vector3	Up = Vector3.up;
			Vector3	Right = Vector3.Cross( Up, m_SunDirection ).normalized;
			Up = Vector3.Cross( m_SunDirection, Right );

			m_Sun2World.SetColumn( 0, Help.Vec3ToVec4( Right, 0.0f ) );
			m_Sun2World.SetColumn( 1, Help.Vec3ToVec4( Up, 0.0f ) );
			m_Sun2World.SetColumn( 2, Help.Vec3ToVec4( m_SunDirection, 0.0f ) );
			m_Sun2World.SetColumn( 3, Help.Vec3ToVec4( m_PlanetCenterKm, 1.0f ) );		// Center on the planet
			m_World2Sun = m_Sun2World.inverse;

			// Update the Sun's angles
			m_SunTheta = (float) Math.Acos( m_SunDirection.y );
			m_SunPhi = (float) Math.Atan2( m_SunDirection.x, m_SunDirection.z );

			// Also update game object's transform
			if ( m_bSunDrivenDirection && m_Sun != null )
				m_Sun.transform.LookAt( m_Sun.transform.position - m_SunDirection, m_Sun2World.GetRow( 1 ) );

			// Update cached values
			UpdateLightingCachedValues();

			// Notify
			if ( SunDirectionChanged != null )
				SunDirectionChanged( this, EventArgs.Empty );
		}
	}

	/// <summary>
	/// Gets or sets the Sun's azimuth in radians
	/// </summary>
	public float					SunAzimuth
	{
		get { return m_SunPhi; }
		set
		{
			value = Mathf.Clamp( value, -Mathf.PI, +Mathf.PI );
			if ( Mathf.Approximately( value, m_SunPhi ) )
				return;

			m_SunPhi = value;
			SunDirection = new Vector3( Mathf.Sin( m_SunPhi ) * Mathf.Sin( m_SunTheta ), Mathf.Cos( m_SunTheta ), Mathf.Cos( m_SunPhi ) * Mathf.Sin( m_SunTheta ) );
		}
	}

	/// <summary>
	/// Gets or sets the Sun's elevation in radians
	/// </summary>
	public float					SunElevation
	{
		get { return m_SunTheta; }
		set
		{
			value = Mathf.Clamp( value, 1e-4f, Mathf.PI );
			if ( Mathf.Approximately( value, m_SunTheta ) )
				return;

			m_SunTheta = value;
			SunDirection = new Vector3( Mathf.Sin( m_SunPhi ) * Mathf.Sin( m_SunTheta ), Mathf.Cos( m_SunTheta ), Mathf.Cos( m_SunPhi ) * Mathf.Sin( m_SunTheta ) );
		}
	}

	/// <summary>
	/// Tells if Nuaj' drives the Sun game object (usually, a directional light).
	/// If true, the light's direction is set by Nuaj'.
	/// If false, the light's direction is used by Nuaj'.
	/// </summary>
	public bool						NuajDrivesSunDirection
	{
		get { return m_bSunDrivenDirection; }
		set { m_bSunDrivenDirection = value; }
	}

	/// <summary>
	/// Tells if Nuaj' drives the Sun game object (usually, a directional light).
	/// If true, the light's direction is set by Nuaj'
	/// </summary>
	public bool						NuajDrivesSunDirectionalColor
	{
		get { return m_bSunDrivenDirectionalColor; }
		set { m_bSunDrivenDirectionalColor = value; }
	}

	/// <summary>
	/// Tells if Nuaj' drives the Scene's ambient lighting.
	/// If true, the ambient color is set by Nuaj'
	/// </summary>
	public bool						NuajDrivesSunAmbientColor
	{
		get { return m_bSunDrivenAmbientColor; }
		set { m_bSunDrivenAmbientColor = value; }
	}

	/// <summary>
	/// Gets or sets the Sun's hue (i.e. the Sun's hue in space, without alteration by the atmosphere)
	/// </summary>
	public Color					SunHue
	{
		get { return m_SunHue; }
		set
		{
			if ( Color.Equals( value, m_SunHue ) )
				return;

			m_SunHue = value;
			UpdateLightingCachedValues();
		}
	}

	/// <summary>
	/// Gets or sets the Sun's intensity (i.e. the Sun's intensity in space, without alteration by the atmosphere)
	/// </summary>
	public float					SunIntensity
	{
		get { return m_SunIntensity; }
		set
		{
			if ( Mathf.Approximately( value, m_SunIntensity ) )
				return;
			m_SunIntensity = value;
			UpdateLightingCachedValues();
		}
	}

	/// <summary>
	/// Tells if Nuaj' should render the environment in software (i.e. CPU computed) or hardware.
	/// Hardware environment is much more accurate but uses an additional GPU overhead to render the environment map.
	/// Software environment lacks the contribution of clouds and shadow but is a bit faster to evaluate.
	/// </summary>
	public bool						RenderSoftwareEnvironment
	{
		get { return m_bRenderSoftwareEnvironment; }
		set { m_bRenderSoftwareEnvironment = value; }
	}

	/// <summary>
	/// Gets the Sun's color (i.e. the Sun's color in space, without alteration by the atmosphere).
	/// If you need the Sun's color as seen from the camera (with alteration by the atmosphere) use ModulePerspective.RenderedSunColor
	/// </summary>
	/// <remarks>This value is equivalent to SunIntensity * SunHue</remarks>
	public Vector3					SunColor
	{
		get { return m_SunColor; }
	}

	/// <summary>
	/// Gets or sets the ambient night sky color to add a little light at night
	/// This parameter is set by the background satellites
	/// </summary>
	internal Vector3				AmbientNightSky
	{
		get { return m_AmbientNightSky; }
		set
		{
			if ( Help.Approximately( value, m_AmbientNightSky ) )
				return;

			m_AmbientNightSky = value;
			UpdateLightingCachedValues();
		}
	}

	#endregion

	#region Tone Mapping

	/// <summary>
	/// Gets or sets the type of luminance computation to apply to the image to compute its luminance
	/// </summary>
	public LUMINANCE_COMPUTATION_TYPE	LuminanceComputationType
	{
		get { return m_LuminanceComputationType; }
		set
		{
			if ( value == m_LuminanceComputationType )
				return;

			m_LuminanceComputationType = value;

			// Notify
			if ( LuminanceComputationTypeChanged != null )
				LuminanceComputationTypeChanged( this, EventArgs.Empty );
		}
	}

	/// <summary>
	/// Gets or sets the tone mapping interpolant to choose between average (0) or maximum (1) image luminance
	/// </summary>
	public float					LuminanceAverageOrMax
	{
		get { return m_LuminanceAverageOrMax; }
		set { m_LuminanceAverageOrMax = m_ImageScaler.AverageOrMax = value; }
	}

	/// <summary>
	/// Tells if the main input scene was rendered in LDR or HDR.
	/// If the scene is LDR then a strange feedback loop needs to be used to approximately convert the scene into HDR.
	/// Otherwise, the scene is simply used "as is" without correction.
	/// </summary>
	public bool						SceneIsHDR
	{
		get { return m_bSceneIsHDR; }
		set { m_bSceneIsHDR = value; }
	}

	/// <summary>
	/// Gets or sets the luminance correction factor to apply to scene lighting
	/// </summary>
	public float					SceneLuminanceCorrection
	{
		get { return m_SceneLuminanceCorrection; }
		set { m_SceneLuminanceCorrection = value; }
	}

	/// <summary>
	/// Gets or sets the immediate image luminance with which we will tone map the image.
	/// NOTE: Setting the image luminance is useless if the LuminanceComputationType is not set to "CUSTOM".
	/// NOTE: This luminance is slowly adapted with time and is not used immediately by the tone mapper.
	/// </summary>
	public float					ImmediateImageLuminance
	{
		get { return m_ImageLuminance; }
		set { m_ImageLuminance = value; }
	}

	/// <summary>
	/// Gets the current tone mapping image luminance.
	/// This is the value with which we perform the tone mapping to adapt the HDR rendering down to LDR
	/// </summary>
	public Vector3					ToneMappingLuminance
	{
		get { return m_CurrentAdaptationLuminance; }
	}

	/// <summary>
	/// Gets or sets the type of tone mapping to apply to the image
	/// </summary>
	public TONE_MAPPING_TYPE		ToneMappingType
	{
		get { return m_ToneMappingType; }
		set
		{
			if ( value == m_ToneMappingType )
				return;

			m_ToneMappingType = value;

			// Notify
			if ( ToneMappingTypeChanged != null )
				ToneMappingTypeChanged( this, EventArgs.Empty );
		}
	}

	#region Parameters for the different algorithms used

	/// <summary>
	/// Gets the tone mapping parameters for the Reinhard algorithm
	/// </summary>
	public ToneMappingParameters_Reinhard		ToneMappingParamsReinhard		{ get { return m_ToneMappingParamsReinhard; } }
	/// <summary>
	/// Gets the tone mapping parameters for the Drago algorithm (i.e. log)
	/// </summary>
	public ToneMappingParameters_Drago			ToneMappingParamsDrago			{ get { return m_ToneMappingParamsDrago; } }
	/// <summary>
	/// Gets the tone mapping parameters for the Filmic algorithm
	/// </summary>
	public ToneMappingParameters_Filmic			ToneMappingParamsFilmic			{ get { return m_ToneMappingParamsFilmic; } }
	/// <summary>
	/// Gets the tone mapping parameters for the Exponential algorithm
	/// </summary>
	public ToneMappingParameters_Exponential	ToneMappingParamsExponential	{ get { return m_ToneMappingParamsExponential; } }
	/// <summary>
	/// Gets the tone mapping parameters for the Linear algorithm
	/// </summary>
	public ToneMappingParameters_Linear			ToneMappingParamsLinear			{ get { return m_ToneMappingParamsLinear; } }

	#endregion

	/// <summary>
	/// Gets or sets the tone mapping gamma correction for shadows
	/// </summary>
	public float					ToneMappingGammaShadows
	{
		get { return m_ToneMappingGammaShadows; }
		set { m_ToneMappingGammaShadows = value; }
	}

	/// <summary>
	/// Gets or sets the tone mapping gamma correction for highlights
	/// </summary>
	public float					ToneMappingGammaHighlights
	{
		get { return m_ToneMappingGammaHighlights; }
		set { m_ToneMappingGammaHighlights = value; }
	}

	/// <summary>
	/// Gets or sets the tone mapping boundary between shadows and highlights
	/// </summary>
	public float					ToneMappingGammaShadowsHighlightsBoundary
	{
		get { return m_ToneMappingGammaBoundary; }
		set { m_ToneMappingGammaBoundary = value; }
	}

	/// <summary>
	/// Gets or sets the tone mapping intensity boost factor
	/// </summary>
	public float					ToneMappingIntensityBoostFactor
	{
		get { return m_ToneMappingBoostFactor; }
		set { m_ToneMappingBoostFactor = value; }
	}

	#endregion

	#region Luminance Adaptation

	/// <summary>
	/// Gets or sets the minimum adaptable luminance at day
	/// </summary>
	public float					ToneMappingMinLuminanceAtDay
	{
		get { return m_ToneMappingMinLuminanceAtDay; }
		set { m_ToneMappingMinLuminanceAtDay = value; }
	}

	/// <summary>
	/// Gets or sets the maximum adaptable luminance at day
	/// </summary>
	public float					ToneMappingMaxLuminanceAtDay
	{
		get { return m_ToneMappingMaxLuminanceAtDay; }
		set { m_ToneMappingMaxLuminanceAtDay = value; }
	}

	/// <summary>
	/// Gets or sets the tone mapping adaptation speed at which we adapt the scene's luminance at day (0 is very slow, 1 is instantaneous)
	/// </summary>
	public float					ToneMappingAdaptationSpeedAtDay
	{
		get { return m_ToneMappingAdaptationSpeedAtDay; }
		set { m_ToneMappingAdaptationSpeedAtDay = value; }
	}

	/// <summary>
	/// Gets or sets the minimum adaptable luminance at night
	/// </summary>
	public float					ToneMappingMinLuminanceAtNight
	{
		get { return m_ToneMappingMinLuminanceAtNight; }
		set { m_ToneMappingMinLuminanceAtNight = value; }
	}

	/// <summary>
	/// Gets or sets the maximum adaptable luminance at night
	/// </summary>
	public float					ToneMappingMaxLuminanceAtNight
	{
		get { return m_ToneMappingMaxLuminanceAtNight; }
		set { m_ToneMappingMaxLuminanceAtNight = value; }
	}

	/// <summary>
	/// Gets or sets the tone mapping adaptation speed at which we adapt the scene's luminance at day (0 is very slow, 1 is instantaneous)
	/// </summary>
	public float					ToneMappingAdaptationSpeedAtNight
	{
		get { return m_ToneMappingAdaptationSpeedAtNight; }
		set { m_ToneMappingAdaptationSpeedAtNight = value; }
	}

	/// <summary>
	/// Gets or sets the factor to apply to the tone mapped Sun color to make it a Unity LDR color
	/// </summary>
	public float					UnitySunColorFactor
	{
		get { return m_UnitySunColorFactor; }
		set { m_UnitySunColorFactor = value; }
	}

	/// <summary>
	/// Gets or sets the factor to apply to the tone mapped Sky color to make it a Unity LDR ambient color
	/// </summary>
	public float					UnityAmbientColorFactor
	{
		get { return m_UnityAmbientColorFactor; }
		set { m_UnityAmbientColorFactor = value; }
	}

	#endregion

	#region Glow Support

	/// <summary>
	/// Tells if Nuaj' should support the Glow effect.
	/// If true, the alpha written by Nuaj will trigger the glow effect.
	/// If false, the alpha is your scene's alpha passed through
	/// </summary>
	public bool						EnableGlowSupport
	{
		get { return m_bEnableGlowSupport; }
		set { m_bEnableGlowSupport = value; }
	}

	/// <summary>
	/// Tells if written alpha should be Nuaj' computed alpha only (false) or the maximum of your scene's alpha and Nuaj's alpha (true)
	/// </summary>
	/// <remarks>Only works if glow support is enabled</remarks>
	public bool						GlowCombineAlphas
	{
		get { return m_bCombineAlphas; }
		set { m_bCombineAlphas = value; }
	}

	/// <summary>
	/// Gets or sets the threshold at which intensity makes no glow
	/// </summary>
	public float					GlowIntensityThresholdMin
	{
		get { return m_GlowIntensityThreshold.x; }
		set { m_GlowIntensityThreshold.x = value; }
	}

	/// <summary>
	/// Gets or sets the threshold at which intensity has a maximum glow
	/// </summary>
	public float					GlowIntensityThresholdMax
	{
		get { return m_GlowIntensityThreshold.y; }
		set { m_GlowIntensityThreshold.y = value; }
	}

	#endregion

	#region Shadow Map Parameters

	/// <summary>
	/// Gets or sets the size of the global shadow map for sky and world shadowing
	/// </summary>
	public int						ShadowMapSize
	{
		get { return m_ShadowMapSize; }
		set
		{
			value = Math.Max( 64, value );
			if ( value == m_ShadowMapSize )
				return;

			m_ShadowMapSize = value;

			InitializeShadowMap();

			// Notify
			if ( ShadowMapSizeChanged != null )
				ShadowMapSizeChanged( this, EventArgs.Empty );
		}
	}

	/// <summary>
	/// Gets or sets the far clip distance for shadows
	/// </summary>
	public float					ShadowDistanceFar
	{
		get { return m_ShadowDistanceFar; }
		set { m_ShadowDistanceFar = value; }
	}

	/// <summary>
	/// Gets or sets the light cookie enabled state.
	/// If enabled, the shadow map will be used as a light cookie and will also shadow the scene.
	/// Notice that it requires a Sun object to be plugged-in, and the Sun object must have a Light component
	/// </summary>
	public bool						CastShadowUsingLightCookie
	{
		get { return m_bCastShadowUsingLightCookie; }
		set
		{
			if ( value == m_bCastShadowUsingLightCookie )
				return;

			m_bCastShadowUsingLightCookie = value;

			InitializeLightCookie();
		}
	}

	/// <summary>
	/// Gets or sets the size of the light cookie texture
	/// </summary>
	public int						LightCookieTextureSize
	{
		get { return m_LightCookieTextureSize; }
		set
		{
			value = Math.Max( 32, value );
			if ( value == m_LightCookieTextureSize )
				return;

			m_LightCookieTextureSize = value;

			InitializeLightCookie();
		}
	}

	/// <summary>
	/// Gets or sets the size of the light cookie in WORLD units.
	/// NOTE: This is the SAME property as the "light cookie size" on directional lights but Unity doesn't provide any way of changing that property at the moment.
	///  so I have to duplicate it here. It's a bit annoying since you need to synchronize the 2 values both in here and in your directional light so they match.
	/// </summary>
	public float					LightCookieSize
	{
		get { return m_LightCookieSize; }
		set { m_LightCookieSize = value; }
	}

	/// <summary>
	/// Gets or sets the light cookie camera altitude sampling state.
	/// If true, the light cookie will sample the shadow map at camera's altitude, overriding the manual LightCookieSampleAltitude property.
	/// </summary>
	public bool						LightCookieSampleAtCameraAltitude
	{
		get { return m_bLightCookieSampleAtCameraAltitude; }
		set { m_bLightCookieSampleAtCameraAltitude = value; }
	}

	/// <summary>
	/// Gets or sets the altitude (in kilometers) where shadow map is sampled
	/// </summary>
	public float					LightCookieSampleAltitudeKm
	{
		get { return m_LightCookieSampleAltitudeKm; }
		set { m_LightCookieSampleAltitudeKm = value; }
	}

	#endregion

	#region World Parameters

	/// <summary>
	/// Gets or sets the World's scale factor that maps a unit to a kilometer
	/// </summary>
	public float					WorldUnit2Kilometer	{ get { return m_WorldUnit2Kilometer; } set { m_WorldUnit2Kilometer = value; UpdatePlanetCachedValues(); } }

	/// <summary>
	/// Gets or sets the ZBuffer discrepancy threshold that helps to determine which pixels should be recomputed at full resolution.
	/// </summary>
	public float					ZBufferDiscrepancyThreshold		{ get { return m_ZBufferDiscrepancyThreshold; } set { m_ZBufferDiscrepancyThreshold = Mathf.Max( 0.02f, value ); } }

	/// <summary>
	/// Gets or sets the technique used to up-scale and refine the downscaled rendering
	/// </summary>
	public UPSCALE_TECHNIQUE		UpScaleTechnique
	{
		get { return m_UpScaleTechnique; }
		set
		{
			if ( value == m_UpScaleTechnique )
				return;

			m_UpScaleTechnique = value;

			// Notify modules
			foreach ( ModuleBase M in m_Modules )
				M.UpScaleTechniqueChanged( m_UpScaleTechnique );
		}
	}

	/// <summary>
	/// Shows the ZBuffer discrepancies and highlights in red the pixels that need to be recomputed at full resolution.
	/// This is a helper for you to tweak the threshold nicely depending on the precision of your scene.
	/// </summary>
	public bool						ShowZBufferDiscrepancies		{ get { return m_bShowZBufferDiscrepancies; } set { m_bShowZBufferDiscrepancies = value; } }

	/// <summary>
	/// Gets or sets the position of the planet's center (in kilometers)
	/// </summary>
	public Vector3					PlanetCenter		{ get { return m_PlanetCenterKm; } set { m_PlanetCenterKm = value; UpdatePlanetCachedValues(); } }

	/// <summary>
	/// Gets or sets the normal to planet's surface where the camera is currently standing
	/// </summary>
	public Vector3					PlanetNormal		{ get { return m_PlanetNormal; } set { m_PlanetNormal = value.normalized; UpdatePlanetCachedValues(); } }

	/// <summary>
	/// Gets or sets the radius of the planet (in kilometers)
	/// </summary>
	public float					PlanetRadiusKm
	{
		get { return m_PlanetRadiusKm; }
		set
		{
			if ( Mathf.Approximately( value, m_PlanetRadiusKm ) )
				return;

			m_PlanetRadiusKm = value;
			UpdatePlanetCachedValues();

			// Notify
			if ( PlanetDimensionsChanged != null )
				PlanetDimensionsChanged( this, EventArgs.Empty );
		}
	}

	/// <summary>
	/// Gets or sets the altitude of the top of the planet's atmosphere (in kilometers)
	/// </summary>
	public float					PlanetAtmosphereAltitudeKm
	{
		get { return m_PlanetAtmosphereAltitudeKm; }
		set
		{
			if ( Mathf.Approximately( value, m_PlanetAtmosphereAltitudeKm ) )
				return;

			m_PlanetAtmosphereAltitudeKm = value;
			UpdatePlanetCachedValues();

			// Notify
			if ( PlanetDimensionsChanged != null )
				PlanetDimensionsChanged( this, EventArgs.Empty );
		}
	}

	/// <summary>
	/// Gets the radius of the planet, including its atmosphere (in kilometers)
	/// </summary>
	public float					PlanetAtmosphereRadiusKm	{ get { return m_PlanetRadiusKm + m_PlanetAtmosphereAltitudeKm; } }

	#endregion

	#region Local Variations

	/// <summary>
	/// Gets or sets the local coverage map locator.
	/// This allows you (yes, you!) to setup the local cloud coverage.
	/// Each of the four cloud layers is added coverage as specified by this map's RGBA values.
	/// </summary>
	public GameObject				LocalCoverage
	{
		get { return m_LocalCoverage; }
		set
		{
			if ( value == m_LocalCoverage )
				return;
			if ( value != null && !value.GetComponent<NuajMapLocator>() )
			{	// Not a camera !
				Nuaj.Help.LogError( "The GameObject assigned as LocalCoverage must have a NuajMapLocator component !" ); 
				return;
			}

			m_LocalCoverage = value;
		}
	}

	/// <summary>
	/// Gets or sets the terrain emissive map locator.
	/// This allows you to setup the local terrain color that gets reflected by the clouds.
	/// This is very useful to simulate a city by night for example.
	/// </summary>
	public GameObject				TerrainEmissive
	{
		get { return m_TerrainEmissive; }
		set
		{
			if ( value == m_TerrainEmissive )
				return;
			if ( value != null && !value.GetComponent<NuajMapLocator>() )
			{	// Not a locator !
				Nuaj.Help.LogError( "The GameObject assigned as TerrainEmissive must have a NuajMapLocator component !" ); 
				return;
			}

			m_TerrainEmissive = value;
		}
	}

	/// <summary>
	/// Gets or sets the terrain albedo used to reflect the Sun and ambient sky on the clouds so they appear to be lit by underneath
	/// </summary>
	public Color					TerrainAlbedo
	{
		get { return m_TerrainAlbedo; }
		set { m_TerrainAlbedo = value; }
	}

	#endregion

	#region Lightning

	/// <summary>
	/// Gets the first parametrable lightning bolt
	/// </summary>
	public GameObject			LightningBolt0
	{
		get { return m_LightningBolt0; }
		set
		{
			if ( value == m_LightningBolt0 )
				return;
			if ( value != null && !value.GetComponent<NuajLightningBolt>() )
			{	// Not a lightning bolt !
				Nuaj.Help.LogError( "The GameObject assigned as LightningBolt0 must have a NuajLightningBolt component !" ); 
				return;
			}

			m_LightningBolt0 = value;
		}
	}

	/// <summary>
	/// Gets the second parametrable lightning bolt
	/// </summary>
	public GameObject			LightningBolt1
	{
		get { return m_LightningBolt1; }
		set
		{
			if ( value == m_LightningBolt1 )
				return;
			if ( value != null && !value.GetComponent<NuajLightningBolt>() )
			{	// Not a lightning bolt !
				Nuaj.Help.LogError( "The GameObject assigned as LightningBolt1 must have a NuajLightningBolt component !" ); 
				return;
			}

			m_LightningBolt1 = value;
		}
	}

	#endregion

	#region Modules Access

	/// <summary>
	/// Gets the list of available modules
	/// </summary>
	public ModuleBase[]				Modules				{ get { return m_Modules; } }

	/// <summary>
	/// Gets the module that manages the sky and aerial perspective
	/// </summary>
	public ModulePerspective		ModuleSky			{ get { return m_ModulePerspective; } }

	/// <summary>
	/// Gets the module that manages the cloud layers
	/// </summary>
	public ModuleCloudLayer			ModuleCloudLayer	{ get { return m_ModuleCloudLayer; } }

	/// <summary>
	/// Gets the module that manages the volumes cloud
	/// </summary>
	public ModuleCloudVolume		ModuleCloudVolume	{ get { return m_ModuleCloudVolume; } }

	/// <summary>
	/// Gets the module that manages the satellites
	/// </summary>
	public ModuleSatellites			ModuleSatellites	{ get { return m_ModuleSatellites; } }

	#endregion

	#region Error & Warning State

	/// <summary>
	/// Tells if the module is in an error state
	/// </summary>
	public bool						IsInErrorState		{ get { return m_bInErrorState; } }

	/// <summary>
	/// Gives informations about the error state
	/// </summary>
	public string					Error				{ get { return m_Error; } }

	/// <summary>
	/// Tells if the module is in an warning state
	/// </summary>
	public bool						IsInWarningState	{ get { return m_bInWarningState; } }

	/// <summary>
	/// Gives informations about the warning state
	/// </summary>
	public string					Warning				{ get { return m_Warning; } }

	#endregion

	/// <summary>
	/// Gets or sets the interval (in amount of frames) at which CPU read back is performed
	/// An interval value &lt;=1 means CPU read back is performed every frame
	/// </summary>
	public int						CPUReadBackFramesInterval
	{
		get { return m_CPUReadBackFramesInterval; }
		set { m_CPUReadBackFramesInterval = value; }
	}

	/// <summary>
	/// Gets the scattering texture last rendered by the manager
	/// </summary>
	public RenderTexture			TextureScattering	{ get { return m_RTScattering; } }

	/// <summary>
	/// Gets the background texture where satellites are rendered
	/// </summary>
	public RenderTexture			TextureBackground	{ get { return m_RTBackground; } }

	/// <summary>
	/// Gets the background environment texture where satellites are rendered
	/// </summary>
	public RenderTexture			TextureBackgroundEnvironment	{ get { return m_RTBackgroundEnvironment; } }

	// Internal data
	internal Vector4				CameraData			{ get { return m_CameraData; } }
	internal Matrix4x4				Camera2World		{ get { return m_Camera2World; } }
	internal Matrix4x4				World2Camera		{ get { return m_World2Camera; } }

	/// <summary>
	/// Occurs when the Camera object changed
	/// </summary>
	public event EventHandler		CameraChanged;

	/// <summary>
	/// Occurs when the Sun object changed
	/// </summary>
	public event EventHandler		SunChanged;

	/// <summary>
	/// Occurs when the Sun direction was updated
	/// </summary>
	public event EventHandler		SunDirectionChanged;

	/// <summary>
	/// Occurs when the planet's center, dimensions or orientation changed
	/// </summary>
	public event EventHandler		PlanetDimensionsChanged;

	/// <summary>
	/// Occurs when the shadow map size changed
	/// </summary>
	public event EventHandler		ShadowMapSizeChanged;

	/// <summary>
	/// Occurs when the tone mapping algorithm changed
	/// </summary>
	public event EventHandler		ToneMappingTypeChanged;

	/// <summary>
	/// Occurs when the luminance adaptation algorithm changed
	/// </summary>
	public event EventHandler		LuminanceComputationTypeChanged;

	/// <summary>
	/// Occurs when Nuaj' entered or exited the error state
	/// </summary>
	public event EventHandler		ErrorStateChanged;

	/// <summary>
	/// Occurs when Nuaj' entered or exited the warning state
	/// </summary>
	public event EventHandler		WarningStateChanged;

	/// <summary>
	/// Occurs every frame and replaces the software or hardware environment rendering
	/// </summary>
	public event CustomEnvironmentRenderingEventHandler	CustomEnvironmentRender;

	/// <summary>
	/// Occurs every frame right BEFORE the satellites are rendered into the background buffer.
	/// You can then perform custom background clear
	/// </summary>
	public event CustomBackgroundClearEventHandler		CustomBackgroundClear;

	/// <summary>
	/// Occurs every frame right AFTER the satellites have been rendered into the background buffer.
	/// You can then perform custom background rendering for your own satellites
	/// </summary>
	public event CustomBackgroundRenderEventHandler		CustomBackgroundRender;

	/// <summary>
	/// Occurs every frame when the Sky module is disabled.
	/// It is then up to you to compose the clouds and background together
	/// </summary>
	public event CustomSkyCompositionEventHandler		CustomSkyComposition;

	/// <summary>
	/// Occurs every frame right before tone mapping so you have a chance to perform your own custom luminance adaptation.
	/// For example, you can perform temporal adaptation to slowly adapt from very dark zones to bright ones, like the
	///  blooming effect that occurs when you exit a tunnel.
	/// Or, you can limit adaption and return a special blue-ish tint at night.
	/// Or even a greenish tint with special adaptation if you look through light amplification goggles.
	/// </summary>
	public event CustomLuminanceAdaptationEventHandler	CustomLuminanceAdaptation;

	#endregion

	#region METHODS

	public		NuajManager()
	{
		// =========== Build list ===========
		m_Modules = new ModuleBase[4];
		m_Modules[0] = m_ModulePerspective;
		m_Modules[1] = m_ModuleCloudLayer;
		m_Modules[2] = m_ModuleCloudVolume;
		m_Modules[3] = m_ModuleSatellites;

		// =========== Subscribe to events ===========
		m_ModulePerspective.SkyParametersChanged += new EventHandler( ModulePerspective_SkyParametersChanged );
	}

	#region MonoBehaviour Members

	void		OnDestroy()
	{
		Nuaj.Help.LogDebug( "NuajManager.OnDestroy() !" );

		// Clear drive camera
		Camera = null;

		// Destroy render targets
		DestroyRenderTargets();
		DestroyShadowMap();
		DestroyLightCookie();

		// Destroy modules
		foreach ( ModuleBase Module in m_Modules )
			Module.OnDestroy();
	}

	void		Awake()
	{
		Nuaj.Help.LogDebug( "NuajManager.Awake() !" );

		// Awake modules
		foreach ( ModuleBase Module in m_Modules )
		{
			Module.Owner = this;	// Reconnect the owner...
			Module.Awake();
		}

		InitializeShadowMap();
		InitializeLightCookie();
	}

	void		Start()
	{
		if ( !enabled )
			return;

		Nuaj.Help.LogDebug( "NuajManager.Start() !" );

		// Start modules
		foreach ( ModuleBase Module in m_Modules )
			Module.Start();
	}

	void		OnEnable()
	{
		Nuaj.Help.LogDebug( "NuajManager.OnEnable() !" );

		try
		{
			if ( !SystemInfo.supportsImageEffects || !SystemInfo.supportsRenderTextures )
				throw new Exception( "Your system configuration does not support image effects or RenderTextures !\r\nNuaj' Atmosphere Manager cannot work and is therefore disabled..." );

			// Create the materials
			m_MaterialCompose = Nuaj.Help.CreateMaterial( "ComposeAtmosphere" );
			m_MaterialClearTexture = Nuaj.Help.CreateMaterial( "Utility/ClearTexture" );
			m_MaterialRenderLightCookie = Nuaj.Help.CreateMaterial( "RenderLightCookie" );
			m_MaterialDownScaleZBuffer = Nuaj.Help.CreateMaterial( "Utility/DownScaleZ" );

			// Create the tone mapper
			m_ImageScaler.OnEnable();

			// Initialize Sun direction
			Vector3	OldDirection = m_SunDirection;
			m_SunDirection = Vector3.zero;
			SunDirection = OldDirection;

			// Initialize image effect if it's missing (shouldn't be the case but when debugging you never know what can fuck up)
			CreateOrAttachCameraEffect();

			// Initialize shadow map & light cookie if they're missing
			if ( m_RTShadowMap == null )
				InitializeShadowMap();
			if ( m_RTLightCookie == null )
				InitializeLightCookie();

			// Enable modules
			// This is where the materials should be created
			foreach ( ModuleBase Module in m_Modules )
			{
				Module.Owner = this;	// Reconnect the owner... (when the assembly is recompiled, owners have disappeared but Awake() is not called and only OnEnable() is called)
				Module.OnEnable();
			}

			ExitErrorState();
		}
		catch ( Exception _e )
		{	// Fatal error !
			EnterErrorState( _e.Message );
			Nuaj.Help.LogError( "An error occurred while enabling Nuaj' Manager :\r\n" + _e.Message );
			enabled = false;
			return;
		}

		// Restore internal values
		UpdateCachedValues();
	}

	void		OnDisable()
	{
		Nuaj.Help.LogDebug( "NuajManager.OnDisable() !" );

		try
		{
			// Disable modules
			foreach ( ModuleBase Module in m_Modules )
				Module.OnDisable();

			// Destroy the tone mapper
			m_ImageScaler.OnDisable();

			// Destroy materials
			SafeDestroyNuaj( ref m_MaterialCompose );
			SafeDestroyNuaj( ref m_MaterialClearTexture );
			SafeDestroyNuaj( ref m_MaterialRenderLightCookie );
			SafeDestroyNuaj( ref m_MaterialDownScaleZBuffer );

			GC.Collect();
		}
		catch ( Exception _e )
		{
			Nuaj.Help.LogError( "An error occurred while disabling Nuaj' Manager :\r\n" + _e.Message );
			enabled = false;
			return;
		}
	}

	void		Update()
	{
		// Update Nuaj' time
		NuajTime.UpdateTime();

		// Update modules
		foreach ( ModuleBase Module in m_Modules )
			Module.Update();
	}

	#endregion

	#region Rendering

	protected bool	m_bLastFullscreenState = false;
	protected void	BeginFrame()
	{
		if ( Screen.fullScreen != m_bLastFullscreenState )
		{	// We need to disable then enable again on resolution change because we are not notified... (there are too many things that happen without notification if you don't mind my saying)
			enabled = false;
			enabled = true;
		}
		m_bLastFullscreenState = Screen.fullScreen;

		// Clear the amount of CPU data written for that frame
		m_WrittenCPUDataCount = 0;
	}

	protected List<ICloudLayer>	m_RenderCloudLayers = new List<ICloudLayer>();
	protected int				m_CloudLayersCastingShadowCount = 0;

	/// <summary>
	/// Does the main rendering job :
	///	 * Updates transforms for camera and shadow map
	///  * Renders the clouds
	///  * Renders the sky
	///  * Composes sky and clouds together
	///	 * Renders the shadow maps
	///	 * Renders the light cookie (optional)
	/// </summary>
	/// <param name="_CameraData">A bunch of camera data like tan(FOV), aspect ratio, near and far ranges, etc.</param>
	/// <param name="_Camera2World">The CAMERA=>WORLD transform</param>
	/// <param name="_World2Camera">The WORLD=>CAMERA transform</param>
	/// <remarks>This must only be called by the ComposeAtmosphere image effect's OnPreCull() method</remarks>
	internal void		Render( Vector4 _CameraData, Matrix4x4 _Camera2World, Matrix4x4 _World2Camera )
	{
		if ( !enabled || m_bInErrorState || !gameObject.active )
			return;
		if ( !m_bInternalDataAreValid )
			Help.LogError( "INTERNAL DATA ARE NOT VALID !" );

		// BEGIN !
		BeginFrame();

		// Cache camera data
		m_CameraData = _CameraData;
		m_Camera2World = _Camera2World;
		m_World2Camera = _World2Camera;
		UpdateCameraCachedValues();

		// Update local variations
		UpdateLocalVariationsValues();

		// Update lightning
		UpdateLightningValues();

		//////////////////////////////////////////////////////////////////////////
		// 1] Update Sun direction if the light drives the Sun
		if ( m_Sun != null && !m_bSunDrivenDirection )
			SunDirection = -m_Sun.transform.forward;	// Our direction is given by the light


		//////////////////////////////////////////////////////////////////////////
		// 2] Build the sorted list of active cloud layers
		float	CloudAltitudeMaxKm = -m_PlanetRadiusKm;

		m_RenderCloudLayers.Clear();
		m_CloudLayersCastingShadowCount = 0;

		// Add fog layer
		ModulePerspective.FogLayer	FogLayer = m_ModulePerspective.Fog;
		bool	HasFog;
		if ( HasFog = (FogLayer.Enabled && !FogLayer.Bypass) )
		{
			m_RenderCloudLayers.Add( FogLayer );
			CloudAltitudeMaxKm = FogLayer.Altitude;
			if ( FogLayer.CastShadow )
				m_CloudLayersCastingShadowCount++;
		}

		if ( m_ModuleCloudLayer.Enabled )
		{	// Add layer clouds
			foreach ( ICloudLayer L in m_ModuleCloudLayer.CloudLayers )
				if ( L.Enabled && !L.Bypass )
				{
					m_RenderCloudLayers.Add( L );
					if ( L.CastShadow && m_RenderCloudLayers.Count < MAX_ALLOWED_LAYERS )
						m_CloudLayersCastingShadowCount++;

					CloudAltitudeMaxKm = Math.Max( CloudAltitudeMaxKm, L.Altitude );
				}
		}

		if ( m_ModuleCloudVolume.Enabled )
		{	// Add volume clouds
			foreach ( ICloudLayer L in m_ModuleCloudVolume.CloudLayers )
				if ( L.Enabled && !L.Bypass )
				{
					m_RenderCloudLayers.Add( L );
					if ( L.CastShadow && m_RenderCloudLayers.Count < MAX_ALLOWED_LAYERS )
						m_CloudLayersCastingShadowCount++;

					CloudAltitudeMaxKm = Math.Max( CloudAltitudeMaxKm, L.Altitude );
				}
		}

		if ( m_RenderCloudLayers.Count > MAX_ALLOWED_LAYERS )
		{	// Can't render more than 4 layers at a time !
			EnterWarningState(	"You cannot render more than " + MAX_ALLOWED_LAYERS + " layer elements ! There are currently " + m_RenderCloudLayers.Count + " active layers." +
								"\nExcess elements will not be rendered. You must either disable or delete some layers for rendering to proceed correctly." );

			// Trim excess layers
			m_RenderCloudLayers.RemoveRange( MAX_ALLOWED_LAYERS, m_RenderCloudLayers.Count - MAX_ALLOWED_LAYERS );
		}
		else
			ExitWarningState();

		m_RenderCloudLayers.Sort( this );	// Sort from bottom to top

		ICloudLayer[]	CloudLayersArray = m_RenderCloudLayers.ToArray();


		//////////////////////////////////////////////////////////////////////////
		// 3] Compute shadow map boundaries
		PrepareShadowMap( CloudAltitudeMaxKm );


		//////////////////////////////////////////////////////////////////////////
		// 4] Render layer modules from top to bottom so each top layer shadows the bottom one
		m_ShadowMapAltitudesMinKm = Vector4.zero;
		m_ShadowMapAltitudesMaxKm = 0.01f * Vector4.one;
		if ( m_CloudLayersCastingShadowCount < MAX_ALLOWED_LAYERS )
			ClearTarget( m_RTShadowMap, Vector4.one );		// Clear to unit extinction so non-existing layers don't interfere

		// Initialize downscaled environment maps to white (fully transparent)
		ClearTarget( m_RTAmbientEnvMapSky, Vector4.one );
		ClearTarget( m_RTAmbientEnvMapSun, Vector4.one );

		if ( m_RenderCloudLayers.Count > 0 )
		{
			// Initialize invalid layers to top atmosphere altitude
			for ( int LayerIndex=m_RenderCloudLayers.Count; LayerIndex < MAX_ALLOWED_LAYERS; LayerIndex++ )
			{
				switch ( LayerIndex )
				{
					case 0:
						m_ShadowMapAltitudesMinKm.x = m_PlanetAtmosphereAltitudeKm;
						m_ShadowMapAltitudesMaxKm.x = m_PlanetAtmosphereAltitudeKm + 1.0f;
						break;
					case 1:
						m_ShadowMapAltitudesMinKm.y = m_PlanetAtmosphereAltitudeKm;
						m_ShadowMapAltitudesMaxKm.y = m_PlanetAtmosphereAltitudeKm + 1.0f;
						break;
					case 2:
						m_ShadowMapAltitudesMinKm.z = m_PlanetAtmosphereAltitudeKm;
						m_ShadowMapAltitudesMaxKm.z = m_PlanetAtmosphereAltitudeKm + 1.0f;
						break;
					case 3:
						m_ShadowMapAltitudesMinKm.w = m_PlanetAtmosphereAltitudeKm;
						m_ShadowMapAltitudesMaxKm.w = m_PlanetAtmosphereAltitudeKm + 1.0f;
						break;
				}
			}

			// Render layers
			for ( int LayerIndex=m_RenderCloudLayers.Count-1; LayerIndex >= 0; LayerIndex-- )
			{
				ICloudLayer	L = m_RenderCloudLayers[LayerIndex];
				L.Render( LayerIndex, m_RTShadowMap, m_RTAmbientEnvMapSky, m_RTAmbientEnvMapSun, !m_bRenderSoftwareEnvironment );

				// Update shadow altitudes one layer at a time
				// We do this AFTER the layer gets rendered so it doesn't take its own shadow into account...
				switch ( LayerIndex )
				{
					case 0:
						m_ShadowMapAltitudesMinKm.x = L.Altitude;
						m_ShadowMapAltitudesMaxKm.x = L.Altitude + (L.IsVolumetric ? L.Thickness : 0.01f);	// Include layer thickness only for volume clouds
						break;
					case 1:
						m_ShadowMapAltitudesMinKm.y = L.Altitude;
						m_ShadowMapAltitudesMaxKm.y = L.Altitude + (L.IsVolumetric ? L.Thickness : 0.01f);
						break;
					case 2:
						m_ShadowMapAltitudesMinKm.z = L.Altitude;
						m_ShadowMapAltitudesMaxKm.z = L.Altitude + (L.IsVolumetric ? L.Thickness : 0.01f);
						break;
					case 3:
						m_ShadowMapAltitudesMinKm.w = L.Altitude;
						m_ShadowMapAltitudesMaxKm.w = L.Altitude + (L.IsVolumetric ? L.Thickness : 0.01f);
						break;
				}

				// Send new data so the next layer can use the previous layer's shadow
				SetupShadowMapData();

				// Compute a 1x1 version of the environment sky map for ambient shadowing
				m_ModulePerspective.DownScaleSkyEnvMap( L.EnvironmentRenderTargetSky, m_RTAmbientEnvMapSky, true );
				// Combine Sun map
				m_ModulePerspective.CombineSunEnvMap( L.EnvironmentRenderTargetSun, m_RTAmbientEnvMapSun );
			}
		}
		else
			SetupShadowMapData();	// Simply set empty shadow map data

		// Compute the most important layers' ordering data
		ComputeLayersOrder( HasFog );

		//////////////////////////////////////////////////////////////////////////
		// 5] Render satellites

		// Custom clear ?
		if ( CustomBackgroundClear != null )
			CustomBackgroundClear( m_RTBackground );
		else
			ClearTarget( m_RTBackground, Vector4.zero );
		ClearTarget( m_RTBackgroundEnvironment, Vector4.zero );

		// Render
		if ( m_ModuleSatellites.Enabled && m_ModuleSatellites.EnabledSatellitesCount > 0 )
			m_ModuleSatellites.Render( m_RTBackground, m_RTBackgroundEnvironment );

		// A chance to render your own background
		Texture	RTBackground = m_RTBackground;
		if ( CustomBackgroundRender != null )
			RTBackground = CustomBackgroundRender( m_RTBackground );


		//////////////////////////////////////////////////////////////////////////
		// 6] Render environment Sky and Sun
		if ( CustomEnvironmentRender == null )
		{
			if ( m_bRenderSoftwareEnvironment )
				m_ModulePerspective.RenderEnvironmentSoftware();
			else
				m_ModulePerspective.RenderEnvironmentHardware( CloudLayersArray, m_RTShadowMap, m_RTBackgroundEnvironment );
		}
		else
		{	// Custom rendering
			Vector3	SunColor, SkyColor;
			CustomEnvironmentRender( this, out SunColor, out SkyColor );

			m_ModulePerspective.RenderEnvironmentCustom( SunColor, SkyColor );
		}

		//////////////////////////////////////////////////////////////////////////
		// 7] Render light cookie
		if ( m_bCastShadowUsingLightCookie && m_Sun != null && m_Sun.light != null && m_Sun.light.type == LightType.Directional )
		{
//			float	CookieSize = m_Sun.light.spotAngle;	// This is the cookie size for directional lights...
			float	CookieSize = m_LightCookieSize;		// For the moment, can't access it another way...
			float	SampleRadiusKm = m_PlanetRadiusKm + (m_bLightCookieSampleAtCameraAltitude ? CameraAltitudeKm : m_LightCookieSampleAltitudeKm);

			m_MaterialRenderLightCookie.SetFloat( "_CookieSize", CookieSize );
			m_MaterialRenderLightCookie.SetFloat( "_SampleRadiusKm", SampleRadiusKm );
			m_MaterialRenderLightCookie.SetMatrix( "_Light2World", m_Sun.transform.localToWorldMatrix );
			m_MaterialRenderLightCookie.SetTexture( "_TexShadowMap", m_RTShadowMap );

			m_MaterialRenderLightCookie.Blit( null, m_RTLightCookie, 0 );
		}

		//////////////////////////////////////////////////////////////////////////
		// 8] Render sky module and compose with clouds
		if ( m_ModulePerspective.Enabled )
			m_ModulePerspective.Render( m_RTScattering, CloudLayersArray, m_RTShadowMap, RTBackground );
		else if ( CustomSkyComposition != null )
			CustomSkyComposition( CloudLayersArray, m_RTShadowMap, RTBackground );
	}

	/// <summary>
	/// Does the post-processing job of mixing and tone mapping the Unity scene and Nuaj's atmosphere
	/// </summary>
	/// <param name="_Source">The scene's render texture to compose with</param>
	/// <param name="_Destination">The final target with the composited result</param>
	/// <remarks>This must only be called by the ComposeAtmosphere image effect's OnRenderImage() method</remarks>
	internal void		PostProcess( RenderTexture _Source, RenderTexture _Destination )
	{
		if ( !enabled || m_bInErrorState || !gameObject.active )
			return;
		if ( !m_bInternalDataAreValid )
			Help.LogError( "INTERNAL DATA ARE NOT VALID !" );

		//////////////////////////////////////////////////////////////////////////
		// 1] Compute scene luminance as tone mapper input
		m_PreviousFrameLuminance = m_CurrentAdaptationLuminance;

		// 1.1] Compute the LDR->HDR luminance factor from previous frame
		Vector3	LDRSunLight = Vector3.one;
		Light	SunLight = null;
		if ( m_Sun != null && (SunLight = m_Sun.GetComponent<Light>()) != null )
			LDRSunLight = SunLight.intensity * Help.ColorToVec3( SunLight.color );
		float	LDRSunIntensity = Vector3.Dot( LDRSunLight, LUMINANCE );

		Vector3	HDRSunLight = m_ModulePerspective.EnvironmentSunColor;
		float	HDRSunIntensity = Vector3.Dot( HDRSunLight, LUMINANCE );
		float	LDR2HDRSunFactor = m_SceneLuminanceCorrection * HDRSunIntensity / Math.Max( 1e-3f, LDRSunIntensity );

		// Compute the LDR & HDR ambient luminances from previous frame
		float	LDRSkyIntensity = Vector3.Dot( Help.ColorToVec3( RenderSettings.ambientLight ), LUMINANCE );
		Vector3	HDRSkyColor = m_ModulePerspective.EnvironmentSkyColor;
		float	HDRSkyIntensity = m_SceneLuminanceCorrection * Vector3.Dot( HDRSkyColor, LUMINANCE );

		// 1.2] Compute current scene luminance
		switch ( m_LuminanceComputationType )
		{
			case LUMINANCE_COMPUTATION_TYPE.DOWNSCALE:
				m_ImageLuminance = m_ImageScaler.ComputeImageLuminance( this, _Source, m_RTScattering, LDR2HDRSunFactor, LDRSkyIntensity, HDRSkyIntensity, m_bSceneIsHDR );
				break;
			case LUMINANCE_COMPUTATION_TYPE.DOWNSCALE_LOG:
				m_ImageLuminance = m_ImageScaler.ComputeImageLuminanceLog( this, _Source, m_RTScattering, LDR2HDRSunFactor, LDRSkyIntensity, HDRSkyIntensity, m_bSceneIsHDR );
				break;
			case LUMINANCE_COMPUTATION_TYPE.ONE:
				m_ImageLuminance = 1.0f;
				break;
			case LUMINANCE_COMPUTATION_TYPE.CUSTOM:
				// The luminance is set by the user
				break;
		}

		// 1.3] Perform luminance adaptation
		if ( CustomLuminanceAdaptation == null )
			PerformDefaultLuminanceAdaptation();
		else
			m_CurrentAdaptationLuminance = CustomLuminanceAdaptation( this, m_PreviousFrameLuminance, m_ImageLuminance );

		// 1.4] Compute middle grey value necessary for several tone mapping algorithms
		// From eq. 10 in http://wiki.gamedev.net/index.php/D3DBook:High-Dynamic_Range_Rendering
		float	ImageLuminance = Vector3.Dot( m_CurrentAdaptationLuminance, LUMINANCE );
		float	MiddleGrey = 1.03f - 2.0f / (2.0f + Mathf.Log10( 1.0f + ImageLuminance ));

//Help.LogDebug( "AdaptedLuminance = " + ImageLuminance + " (Immediate Luminance = " + m_ImageLuminance + ")" );

		m_ToneMappingParamsFilmic.MiddleGrey = MiddleGrey;
		m_ToneMappingParamsReinhard.MiddleGrey = MiddleGrey;
		m_ToneMappingParamsLinear.MiddleGrey = MiddleGrey;


		//////////////////////////////////////////////////////////////////////////
		// 2] Update Sun & Ambient colors for next frame lighting
		if ( m_Sun != null )
		{
			// Update light's color & intensity
			if ( m_bSunDrivenDirectionalColor && SunLight != null )
				ConvertSunColorToUnityLight( HDRSunLight, SunLight );

			// Update ambient color
			if ( m_bSunDrivenAmbientColor )
				RenderSettings.ambientLight = ConvertAmbientSkyColorToUnityAmbient( HDRSkyColor );
		}


		//////////////////////////////////////////////////////////////////////////
		// 3] Tone Map & Compose the result

		m_MaterialCompose.SetTexture( "_TexScattering", m_RTScattering );
		m_MaterialCompose.SetVector( "_ToneMappingLuminance", m_CurrentAdaptationLuminance );
		m_MaterialCompose.SetFloat( "_ToneMappingBoostFactor", m_ToneMappingBoostFactor );
		m_MaterialCompose.SetFloat( "_GammaShadows", 1.0f / Mathf.Max( 1e-3f, m_ToneMappingGammaShadows ) );
		m_MaterialCompose.SetFloat( "_GammaHighlights", 1.0f / Mathf.Max( 1e-3f, m_ToneMappingGammaHighlights ) );
		m_MaterialCompose.SetFloat( "_GammaBoundary", m_ToneMappingGammaBoundary );

		m_MaterialCompose.SetFloat( "_GlowSupport", m_bEnableGlowSupport ? 1.0f : 0.0f );
		m_MaterialCompose.SetFloat( "_GlowUseMax", m_bCombineAlphas ? 1.0f : 0.0f );
		m_MaterialCompose.SetVector( "_GlowIntensityThreshold", m_GlowIntensityThreshold );


		// Send appropriate parameters based on chosen algorithm
		int		PassIndex = -1;
		switch ( m_ToneMappingType )
		{
			case NuajManager.TONE_MAPPING_TYPE.FILMIC:
				PassIndex = 0;
				m_MaterialCompose.SetFloat( "_Filmic_A", m_ToneMappingParamsFilmic.A );
				m_MaterialCompose.SetFloat( "_Filmic_B", m_ToneMappingParamsFilmic.B );
				m_MaterialCompose.SetFloat( "_Filmic_C", m_ToneMappingParamsFilmic.C );
				m_MaterialCompose.SetFloat( "_Filmic_D", m_ToneMappingParamsFilmic.D );
				m_MaterialCompose.SetFloat( "_Filmic_E", m_ToneMappingParamsFilmic.E );
				m_MaterialCompose.SetFloat( "_Filmic_F", m_ToneMappingParamsFilmic.F );
				m_MaterialCompose.SetFloat( "_Filmic_W", m_ToneMappingParamsFilmic.W );
				m_MaterialCompose.SetFloat( "_FilmicMiddleGrey", m_ToneMappingParamsFilmic.MiddleGrey );
				break;
			case NuajManager.TONE_MAPPING_TYPE.REINHARD:
				PassIndex = 1;
				m_MaterialCompose.SetFloat( "_ReinhardMiddleGrey", m_ToneMappingParamsReinhard.MiddleGrey );
				m_MaterialCompose.SetFloat( "_ReinhardWhiteLuminance", m_ToneMappingParamsReinhard.WhiteLuminance );
				break;
			case NuajManager.TONE_MAPPING_TYPE.DRAGO:
				PassIndex = 2;
				m_MaterialCompose.SetFloat( "_DragoMaxDisplayLuminance", m_ToneMappingParamsDrago.MaxDisplayLuminance );
				m_MaterialCompose.SetFloat( "_DragoBias", m_ToneMappingParamsDrago.Bias );
				break;
			case NuajManager.TONE_MAPPING_TYPE.EXPONENTIAL:
				PassIndex = 3;
				m_MaterialCompose.SetFloat( "_ExponentialExposure", m_ToneMappingParamsExponential.Exposure );
				m_MaterialCompose.SetFloat( "_ExponentialGain", m_ToneMappingParamsExponential.Gain );
				break;
			case NuajManager.TONE_MAPPING_TYPE.LINEAR:
				PassIndex = 4;
				m_MaterialCompose.SetFloat( "_LinearMiddleGrey", m_ToneMappingParamsLinear.MiddleGrey );
				m_MaterialCompose.SetFloat( "_LinearFactor", m_ToneMappingParamsLinear.Factor );
				break;
			case NuajManager.TONE_MAPPING_TYPE.DISABLED:
				PassIndex = 5;
				break;
		}

		m_MaterialCompose.Blit( _Source, _Destination, PassIndex );
	}

	internal void	EndFrame()
	{
		// Clear cached downscaled ZBuffers for next frame
		foreach ( RenderTexture TempRT in m_CachedDownScaledZBuffers.Values )
			Help.ReleaseTemporary( TempRT );
		m_CachedDownScaledZBuffers.Clear();

		// Perform CPU readback if required
		if ( m_WrittenCPUDataCount > 0 && (--m_CPUReadBackFramesCount) <= 0 )
		{
			// Transfer from RenderTexture -> Texture
			RenderTexture.active = m_GPU2CPURenderTextures[0];
			m_CPUReadableTexture.Texture.ReadPixels( new Rect( 0, 0, CPU_READBACK_COUNT, 1 ), 0, 0, false );
			m_CPUReadableTexture.Apply();
			RenderTexture.active = null;

			// Perform a single CPU read-back
			m_CPUReadBack = m_CPUReadableTexture.GetPixels( 0 );

#if USE_CPU_READBACK_TRIPLE_BUFFER
			// Scroll textures
			RenderTexture	Temp = m_GPU2CPURenderTextures[0];
			m_GPU2CPURenderTextures[0] = m_GPU2CPURenderTextures[1];
			m_GPU2CPURenderTextures[1] = m_GPU2CPURenderTextures[2];
			m_GPU2CPURenderTextures[2] = Temp;
#endif
			// Reset frames counter
			m_CPUReadBackFramesCount = m_CPUReadBackFramesInterval;
		}

		// Patrol the temp textures and discard those that haven't been used for a while
		Help.GarbageCollectUnusedTemporaryTextures();

		// Unity bug => Doesn't restore default target...
		RenderTexture.active = null;
	}

	#endregion

	#region Render Targets Size Update

	/// <summary>
	/// This method is called by the EffectComposeAtmosphere camera effect every time the Camera calls "PreCull"
	/// RenderTargets are lazy-initialized
	/// </summary>
	internal void	InitializeTargets( int _ScreenWidth, int _ScreenHeight )
	{
		if ( _ScreenWidth != m_ScreenWidth || _ScreenHeight != m_ScreenHeight )
		{
			Nuaj.Help.LogDebug( "NuajManager.InitializeTargets() => RT Resolution Changed !" );

			// Update resolution
			DestroyRenderTargets();
			CreateRenderTargets( _ScreenWidth, _ScreenHeight );

			m_bInternalDataAreValid = true;
		}

		// Always attempt to create the scaler's targets (it has its own check against same width & height)
		m_ImageScaler.CreateRenderTargets( _ScreenWidth, _ScreenHeight );
	}
	
	protected void	CreateRenderTargets( int _ScreenWidth, int _ScreenHeight )
	{
		if ( _ScreenWidth < 1 || _ScreenHeight < 1 )
		{	// Invalid !
			Nuaj.Help.LogDebug( "NuajManager.CreateRenderTargets() => Invalid resolution, not created..." );
			return;
		}

		Nuaj.Help.LogDebug( "NuajManager.CreateRenderTargets( " + _ScreenWidth + ", " + _ScreenHeight + " )" );

		m_ScreenWidth = _ScreenWidth;
		m_ScreenHeight = _ScreenHeight;

		// Create our render targets
		m_RTScattering = Nuaj.Help.CreateRT( "Scattering0", m_ScreenWidth, m_ScreenHeight, RenderTextureFormat.ARGBHalf, FilterMode.Point, TextureWrapMode.Clamp );
		m_RTBackground = Nuaj.Help.CreateRT( "Background", m_ScreenWidth, m_ScreenHeight, RenderTextureFormat.ARGBHalf, FilterMode.Bilinear, TextureWrapMode.Clamp );
		m_RTBackgroundEnvironment = Nuaj.Help.CreateRT( "BackgroundEnvironment", 2 << NuajManager.ENVIRONMENT_TEXTURE_SIZE_POT, 1 << NuajManager.ENVIRONMENT_TEXTURE_SIZE_POT, RenderTextureFormat.ARGBHalf, FilterMode.Point, TextureWrapMode.Clamp );

		// Notify every module
		foreach ( ModuleBase Module in m_Modules )
			try
			{
 				Module.CreateRenderTargets( m_ScreenWidth, m_ScreenHeight );
			}
			catch ( Exception _e )
			{
				Module.Enabled = false;
				Help.LogError( "Disabling module \"" + Module.Name + "\" failed to create its render targets with error : " + _e.Message + "\n" + _e.StackTrace );
			}

		//////////////////////////////////////////////////////////////////////////
		// Create default stock textures

		// Build the 1x1 empty and transparent cloud texture
		m_TextureEmptyCloud = Help.CreateTexture( "Empty Cloud Texture", 1, 1, TextureFormat.RGBA32, false, FilterMode.Point, TextureWrapMode.Clamp );
		m_TextureEmptyCloud.SetPixel( 0, 0, new Color( 0.0f, 0.0f, 0.0f, 1.0f ) );
		m_TextureEmptyCloud.Apply();
		m_TextureEmptyCloud.IsDirty = false;

		// Build the 1x1 white texture
		m_TextureWhite = Help.CreateTexture( "White Texture", 1, 1, TextureFormat.RGBA32, false, FilterMode.Point, TextureWrapMode.Clamp );
		m_TextureWhite.SetPixel( 0, 0, Color.white );
		m_TextureWhite.Apply();
		m_TextureWhite.IsDirty = false;

		// Build the 1x1 black texture
		m_TextureBlack = Help.CreateTexture( "Black Texture", 1, 1, TextureFormat.RGBA32, false, FilterMode.Point, TextureWrapMode.Clamp );
		m_TextureBlack.SetPixel( 0, 0, Color.black );
		m_TextureBlack.Apply();
		m_TextureBlack.IsDirty = false;

		// Build the 1x1 ambient env maps
		m_RTAmbientEnvMapSky = Help.CreateRT( "AmbientEnvMapSky", 1, 1, RenderTextureFormat.ARGBHalf, FilterMode.Point, TextureWrapMode.Clamp, false );
		m_RTAmbientEnvMapSun = Help.CreateRT( "AmbientEnvMapSun", 1, 1, RenderTextureFormat.ARGBHalf, FilterMode.Point, TextureWrapMode.Clamp, false );

		// Build the 2D noise texture
		m_TextureNoise2D = Help.CreateTexture( "2D Noise Texture", NOISE2D_TEXTURE_SIZE, NOISE2D_TEXTURE_SIZE, TextureFormat.RGBA32, false, FilterMode.Bilinear, TextureWrapMode.Repeat );
		Color[]	NoiseValues = new Color[NOISE2D_TEXTURE_SIZE*NOISE2D_TEXTURE_SIZE];
		Color	Temp;
		for ( int Y=0; Y < NOISE2D_TEXTURE_SIZE; Y++ )
			for ( int X=0; X < NOISE2D_TEXTURE_SIZE; X++ )
			{
				Temp.r = (float) Nuaj.SimpleRNG.GetNormal();
				Temp.g = (float) Nuaj.SimpleRNG.GetNormal();
				Temp.b = (float) Nuaj.SimpleRNG.GetNormal();
				Temp.a = (float) Nuaj.SimpleRNG.GetNormal();
				NoiseValues[NOISE2D_TEXTURE_SIZE*Y+X] = Temp;
			}
		m_TextureNoise2D.SetPixels( NoiseValues, 0 );
		m_TextureNoise2D.Apply();
		m_TextureNoise2D.IsDirty = false;

		// Create the generic 3D noise texture
		Build3DNoise();

		// Create the readable triple buffer
		for ( int BufferIndex=0; BufferIndex < 3; BufferIndex++ )
			m_GPU2CPURenderTextures[BufferIndex] = Help.CreateRT( "GPU2CPURenderTexture" + BufferIndex, CPU_READBACK_COUNT, 1, RenderTextureFormat.ARGB32, FilterMode.Point, TextureWrapMode.Clamp );
		m_CPUReadableTexture = Help.CreateTexture( "CPUReadableTexture", CPU_READBACK_COUNT, 1, TextureFormat.ARGB32, false, FilterMode.Point, TextureWrapMode.Clamp );
	}

	protected void	DestroyRenderTargets()
	{
		Nuaj.Help.LogDebug( "NuajManager.DestroyRenderTargets( " + (m_RTScattering != null ? m_RTScattering.width + ", " + m_RTScattering.height : "<NULL>") + " )" );

		// Destroy our render targets
		SafeDestroy( ref m_RTScattering );
		SafeDestroy( ref m_RTBackground );
		SafeDestroy( ref m_RTBackgroundEnvironment );

		// Destroy tone mapper's targets
		m_ImageScaler.DestroyRenderTargets();

		// Notify every module
		if ( m_Modules != null )
			foreach ( ModuleBase Module in m_Modules )
 				Module.DestroyRenderTargets();

		// Destroy default stock textures
		SafeDestroyNuaj( ref m_TextureEmptyCloud );
		SafeDestroyNuaj( ref m_TextureWhite );
		SafeDestroyNuaj( ref m_TextureBlack );
		SafeDestroy( ref m_RTAmbientEnvMapSky );
		SafeDestroy( ref m_RTAmbientEnvMapSun );
		SafeDestroyNuaj( ref m_TextureNoise2D );
		for ( int BufferIndex=0; BufferIndex < 3; BufferIndex++ )
			SafeDestroy( ref m_GPU2CPURenderTextures[BufferIndex] );
		SafeDestroyNuaj( ref m_CPUReadableTexture );

		// Destroy 3D noise textures
		Destroy3DNoise();

		// Destroy "temp" textures
		Help.DestroyTemporaryTextures();

		GC.Collect();

		m_ScreenWidth = 0;
		m_ScreenHeight = 0;
	}

	// DEBUG
	public void		__DEBUGResetRenderTargets()
	{
		int	TempWidth = m_ScreenWidth;
		int	TempHeight = m_ScreenHeight;
		Help.LogDebugSeparate( "" );
		Help.LogDebug( "Recreating RenderTargets " + TempWidth + "x" + TempHeight );

		DestroyRenderTargets();
		CreateRenderTargets( TempWidth, TempHeight );
	}
	// DEBUG

	#endregion

	#region 3D Noise Texture

	/// <summary>
	/// Create the "3D noise" texture
	/// To simulate 3D textures that are not available in Unity, I create a single long 2D slice of (17*16) x 16
	/// The width is 17*16 so that all 3D slices are packed into a single line, and I use 17 as a single slice width
	///	because I pad the last pixel with the first column of the same slice so bilinear interpolation is correct.
	/// The texture contains 2 significant values in Red and Green :
	///		Red is the noise value in the current W slice
	///		Green is the noise value in the next W slice
	///	Then, the actual 3D noise value is an interpolation of red and green based on actual W remainder
	///	
	/// Next, Blue and Alpha contain 2 "isotropic values" used for isotropic light scattering (cf. the ComputeIsotropicValues() method)
	/// </summary>
	protected void		Build3DNoise()
	{
		// Allocate textures & variables
		m_TextureNoise3D = new NuajTexture2D[NOISE3D_TEXTURE_POT];
		m_Noise3DValuesProbabilities = new Vector3[1+NOISE3D_TEXTURE_POT];

		// Build first noise mip level
		float[,,]	NoiseValues = new float[NOISE3D_TEXTURE_SIZE,NOISE3D_TEXTURE_SIZE,NOISE3D_TEXTURE_SIZE];

		m_Noise3DSumValues = 0.0f;
		for ( int W=0; W < NOISE3D_TEXTURE_SIZE; W++ )
			for ( int V=0; V < NOISE3D_TEXTURE_SIZE; V++ )
				for ( int U=0; U < NOISE3D_TEXTURE_SIZE; U++ )
					m_Noise3DSumValues += (NoiseValues[U,V,W] = (float) SimpleRNG.GetUniform());

		Vector2[,,]	IsotropicValues = ComputeIsotropicValues( 0, NoiseValues );

		// Build actual textures
		for ( int MipLevel=0; MipLevel < NOISE3D_TEXTURE_POT; MipLevel++ )
		{
			int		MipSize = NOISE3D_TEXTURE_SIZE >> MipLevel;
			int		Width = MipSize*(MipSize+1);
			Color[]	Content = new Color[MipSize*Width];

			// Build content
			for ( int W=0; W < MipSize; W++ )
			{
				int	Offset = W * (MipSize+1);

				for ( int V=0; V < MipSize; V++ )
				{
					for ( int U=0; U <= MipSize; U++ )
					{
						Content[Offset+Width*V+U].r = NoiseValues[U & (MipSize-1),V,W];
						Content[Offset+Width*V+U].g = NoiseValues[U & (MipSize-1),V,(W+1) & (MipSize-1)];
						Content[Offset+Width*V+U].b = IsotropicValues[U & (MipSize-1),V,W].x;
						Content[Offset+Width*V+U].a = IsotropicValues[U & (MipSize-1),V,W].y;
					}
				}
			}

			// Create texture
			m_TextureNoise3D[MipLevel] = Help.CreateTexture( "Noise3D #" + MipLevel, Width, MipSize, TextureFormat.ARGB32, false, FilterMode.Bilinear, TextureWrapMode.Repeat );
			m_TextureNoise3D[MipLevel].SetPixels( Content, 0 );
			m_TextureNoise3D[MipLevel].Apply( false, true );

			// Downscale noise values
			int	NextMipSize = MipSize >> 1;
			if ( NextMipSize > 0 )
			{
				float[,,]	NextMipNoiseValues = new float[NextMipSize,NextMipSize,NextMipSize];
				for ( int W=0; W < NextMipSize; W++ )
				{
					int	PW = W << 1;
					for ( int V=0; V < NextMipSize; V++ )
					{
						int	PV = V << 1;
						for ( int U=0; U < NextMipSize; U++ )
						{
							int	PU = U << 1;
							float	Value  = NoiseValues[PU+0,PV+0,PW+0];
									Value += NoiseValues[PU+1,PV+0,PW+0];
									Value += NoiseValues[PU+0,PV+1,PW+0];
									Value += NoiseValues[PU+1,PV+1,PW+0];
									Value += NoiseValues[PU+0,PV+0,PW+1];
									Value += NoiseValues[PU+1,PV+0,PW+1];
									Value += NoiseValues[PU+0,PV+1,PW+1];
									Value += NoiseValues[PU+1,PV+1,PW+1];

							NextMipNoiseValues[U,V,W] = 0.125f * Value;
						}
					}
				}

				NoiseValues = NextMipNoiseValues;
				IsotropicValues = ComputeIsotropicValues( 1+MipLevel, NoiseValues );
			}
		}

		// Setup global variables
		Setup3DNoiseVariables();
	}

	protected void		Destroy3DNoise()
	{
		if ( m_TextureNoise3D != null )
			for ( int MipIndex=0; MipIndex < m_TextureNoise3D.Length; MipIndex++ )
				Help.SafeDestroyNuaj( ref m_TextureNoise3D[MipIndex] );
		m_TextureNoise3D = null;
	}

	protected void		Setup3DNoiseVariables()
	{
		NuajMaterial.SetGlobalFloat( "_NuajNoiseSumValues", m_Noise3DSumValues );
 		for ( int MipIndex=0; MipIndex < m_TextureNoise3D.Length; MipIndex++ )
		{
 			NuajMaterial.SetGlobalTexture( "_NuajTexNoise3D" + MipIndex, m_TextureNoise3D[MipIndex], true );
			NuajMaterial.SetGlobalVector( "_NuajNoiseProbabilities" + MipIndex, m_Noise3DValuesProbabilities[MipIndex] );
		}
	}

	/// <summary>
	/// Computes the "isotropic values" of the noise texture
	/// These values are used to help computing isotropic lighting within the cloud
	/// </summary>
	/// <param name="_MipLevel"></param>
	/// <param name="_Noise"></param>
	/// <returns></returns>
	protected Vector2[,,]	ComputeIsotropicValues( int _MipLevel, float[,,] _Noise )
	{
		int			Size = _Noise.GetLength( 0 );
		Vector2[,,]	Result = new Vector2[Size,Size,Size];

#if USE_COMPLEX_ISOTROPIC_VALUES

		//////////////////////////////////////////////////////////////////////////
		// Count the sum of values and probabilities in the 3 considered volumes :
		//	_ The entire texture (a cube of 1x1x1)
		//	_ A sphere of radius 0.5, tangent to the cube
		//	_ A sphere of radius 0.25
		float	fISize = 1.0f / Math.Max( 1, Size-1 );

		Vector3	SumProbabilities = Vector3.zero;
		Vector4	SumProbabilities2 = Vector4.zero;
		Vector3	P = Vector3.zero;
		for ( int U=0; U < Size; U++ )
		{
			P.x = U * fISize - 0.5f;
			for ( int V=0; V < Size; V++ )
			{
				P.y = V * fISize - 0.5f;
				for ( int W=0; W < Size; W++ )
				{
					P.z = W * fISize - 0.5f;
//						float	SqDistance = P.sqrMagnitude;
					float	Noise = _Noise[U,V,W];

// 						// Accumulate noise values
// 						SumValues.x += Noise;								// Always accumulate for first volume (i.e. cube)
// 						SumValues.y += SqDistance < 0.25f ? Noise : 0.0f;	// Only accumulate if within sphere of radius 0.5
// 						SumValues.z += SqDistance < 0.0625f ? Noise : 0.0f;	// Only accumulate if within sphere of radius 0.25

					// Accumulate probabilities
					SumProbabilities.x += Noise >= 0.25f ? 1.0f : 0.0f;
					SumProbabilities.y += Noise >= 0.5f ? 1.0f : 0.0f;
					SumProbabilities.z += Noise >= 0.75f ? 1.0f : 0.0f;

					// DEBUG (study probability shape)
					SumProbabilities2.x += Noise >= 0.125f ? 1.0f : 0.0f;
					SumProbabilities2.y += Noise >= 0.375f ? 1.0f : 0.0f;
					SumProbabilities2.z += Noise >= 0.625f ? 1.0f : 0.0f;
					SumProbabilities2.w += Noise >= 0.875f ? 1.0f : 0.0f;
				}
			}
		}

		// Normalize probabilities
		SumProbabilities /= Size*Size*Size;		// Now a percentile of total values !
		SumProbabilities2 /= Size*Size*Size;	// Now a percentile of total values !

		m_ValuesProbabilities[_MipLevel] = SumProbabilities;

		//////////////////////////////////////////////////////////////////////////
		// Compute isotropic values
		// These 2 values correspond to the sum of values within 2 spheres of radius 0.5 and 0.25 respectively, normalized by the total sum of values in the texture
		// We need to normalize since we're building a ARGB Texture2D that only accepts [0,1] values.
		// We can later denormalize in the shader since we pass the sum values as a parameter
		fISize = 1.0f / Size;

		Vector3	C = Vector3.zero;
		for ( int U=0; U < Size; U++ )
		{
			C.x = U * fISize - 0.5f;
			for ( int V=0; V < Size; V++ )
			{
				C.y = V * fISize - 0.5f;
				for ( int W=0; W < Size; W++ )
				{
					C.z = W * fISize - 0.5f;

					// Browse the surrounding of current center point C and gather values in spheres of radius 0.5 and 0.25
					Vector2	SumValuesSpheres = Vector2.zero;
					for ( int U2=0; U2 < Size; U2++ )
					{
						P.x = ((1.0f + U2 * fISize - C.x) % 1.0f) - 0.5f;
						for ( int V2=0; V2 < Size; V2++ )
						{
							P.y = ((1.0f + V2 * fISize - C.y) % 1.0f) - 0.5f;
							for ( int W2=0; W2 < Size; W2++ )
							{
								P.z = ((1.0f + W2 * fISize - C.z) % 1.0f) - 0.5f;
								float	SqDistance = P.sqrMagnitude;
								float	Noise = _Noise[U2,V2,W2];

								// Accumulate values if within distance
								SumValuesSpheres.x += SqDistance < 0.25 ? Noise : 0.0f;
								SumValuesSpheres.y += SqDistance < 0.0625 ? Noise : 0.0f;
							}
						}
					}

					// Normalize values using total sum of values in the texture
					Result[U,V,W] = SumValuesSpheres / m_SumValues;
				}
			}
		}
#else
		for ( int U=0; U < Size; U++ )
			for ( int V=0; V < Size; V++ )
				for ( int W=0; W < Size; W++ )
					Result[U,V,W] = Vector2.zero;
#endif

		return Result;
	}

	#endregion

	#region Camera Effect

	protected void	DestroyCameraEffect()
	{
		if ( m_Camera == null )
			return;

		// Un-subscribe from previous camera
		m_CameraEffectComposeAtmosphere.enabled = false;
		DestroyImmediate( m_CameraEffectComposeAtmosphere );
		m_CameraEffectComposeAtmosphere = null;
	}

	protected void	CreateOrAttachCameraEffect()
	{
		if ( m_Camera == null )
			return;

		EffectComposeAtmosphere	ExistingComponent = m_Camera.GetComponent<EffectComposeAtmosphere>();
		if ( ExistingComponent == null )
		{	// Create a new one
			Nuaj.Help.LogDebug( "NuajManager.OnEnable() => Creating EffectComposeAtmosphere !" );
			m_CameraEffectComposeAtmosphere = m_Camera.gameObject.AddComponent<EffectComposeAtmosphere>();
		}
		else if ( ExistingComponent != m_CameraEffectComposeAtmosphere )
		{	// It's ours now !
			Nuaj.Help.LogDebug( "NuajManager.Camera => Reconnecting existing EffectComposeAtmosphere !" );
			m_CameraEffectComposeAtmosphere = ExistingComponent;
		}

		// Setup the owner no matter what
		m_CameraEffectComposeAtmosphere.Owner = this;
	}

	#endregion

	#region Software Tone Mapping

	// You'll find here the equivalent of what happens in the tone mapping shader

	///////////////////////////////////////////////////////////////////////////////
	// Reinhard algorithm
	//
	internal float	ToneMapReinhard( float Y, float _ImageLuminance )
	{
		float	Lwhite = m_ToneMappingParamsReinhard.WhiteLuminance;
		float	L = m_ToneMappingParamsReinhard.MiddleGrey * Y / (1e-3f + _ImageLuminance);
		return	L * (1.0f + L / (Lwhite * Lwhite)) / (1.0f + L);
	}

	///////////////////////////////////////////////////////////////////////////////
	// Drago et al. algorithm
	//
	internal float	ToneMapDrago( float Y, float _ImageLuminance )
	{
		float	Ldmax = m_ToneMappingParamsDrago.MaxDisplayLuminance;
		float	Lw = Y;
		float	Lwmax = _ImageLuminance;
		float	bias = m_ToneMappingParamsDrago.Bias;

		Y  = Ldmax * 0.01f * Mathf.Log( Lw + 1.0f );
		return Y / Mathf.Log10( Lwmax + 1.0f ) * Mathf.Log( 2.0f + 0.8f * Mathf.Pow( Lw / Lwmax, -1.4426950408889634073599246810019f * Mathf.Log( bias ) ) );
	}

	///////////////////////////////////////////////////////////////////////////////
	// Filmic Curve algorithm (Hable)
	//
	float	FilmicToneMapOperator( float _In )
	{
		return ((_In*(m_ToneMappingParamsFilmic.A*_In+m_ToneMappingParamsFilmic.C*m_ToneMappingParamsFilmic.B) + m_ToneMappingParamsFilmic.D*m_ToneMappingParamsFilmic.E) /
			   (_In*(m_ToneMappingParamsFilmic.A*_In+m_ToneMappingParamsFilmic.B) + m_ToneMappingParamsFilmic.D*m_ToneMappingParamsFilmic.F))
			   - m_ToneMappingParamsFilmic.E/m_ToneMappingParamsFilmic.F;
	}

	internal float	ToneMapFilmic( float Y, float _ImageLuminance )
	{
		Y *= m_ToneMappingParamsFilmic.MiddleGrey / _ImageLuminance;
		return FilmicToneMapOperator( Y ) / FilmicToneMapOperator( m_ToneMappingParamsFilmic.W );
	}

	///////////////////////////////////////////////////////////////////////////////
	// Exponential algorithm
	//
	internal float	ToneMapExponential( float Y, float _ImageLuminance )
	{
		return m_ToneMappingParamsExponential.Gain * (1.0f - Mathf.Exp( -m_ToneMappingParamsExponential.Exposure * Y ));
	}

	///////////////////////////////////////////////////////////////////////////////
	// Linear algorithm
	//
	internal float	ToneMapLinear( float Y, float _ImageLuminance )
	{
		return Y * m_ToneMappingParamsLinear.Factor * m_ToneMappingParamsLinear.MiddleGrey / _ImageLuminance;	// Exposure correction
	}

	/// <summary>
	/// Applies software luminance adaptation and tone mapping to the HDR color
	/// </summary>
	/// <param name="_RGB">The HDR color to tone map</param>
	/// <returns>The tone mapped LDR color useable by Unity</returns>
	public Vector3	ToneMap( Vector3 _RGB )
	{
		// Retrieve luminance and tint of the currently adapted luminance
		Vector3	CurrentAdaptationLuminance = m_CurrentAdaptationLuminance;
		float	ImageLuminance = Math.Max( 1e-3f, Math.Max( Math.Max( CurrentAdaptationLuminance.x, CurrentAdaptationLuminance.y ), CurrentAdaptationLuminance.z ) );
		Vector3	ImageTint = CurrentAdaptationLuminance / ImageLuminance;

		// Switch to xyY
		Vector3	xyY = Help.RGB2xyY( _RGB );

		// Apply tone mapping
		switch ( m_ToneMappingType )
		{
			case TONE_MAPPING_TYPE.REINHARD:
				xyY.z = ToneMapReinhard( xyY.z, ImageLuminance );
				break;
			case TONE_MAPPING_TYPE.DRAGO:
				xyY.z = ToneMapDrago( xyY.z, ImageLuminance );
				break;
			case TONE_MAPPING_TYPE.FILMIC:
				xyY.z = ToneMapFilmic( xyY.z, ImageLuminance );
				break;
			case TONE_MAPPING_TYPE.EXPONENTIAL:
				xyY.z = ToneMapExponential( xyY.z, ImageLuminance );
				break;
			case TONE_MAPPING_TYPE.LINEAR:
				xyY.z = ToneMapLinear( xyY.z, ImageLuminance );
				break;
		}

		xyY.z *= m_ToneMappingBoostFactor;

		// Apply gamma and back to RGB
		xyY.z = Mathf.Pow( Math.Max( 0.0f, xyY.z ), 1.0f / m_ToneMappingGammaHighlights );

		_RGB = Help.xyY2RGB( xyY );

		// Apply image tint
		_RGB = Help.Vec3Product( _RGB, ImageTint );

		return _RGB;
	}

	#endregion

	#region Luminance Adaptation

	protected static readonly float	DAY_NIGHT_SHIFT_SMOOTH_ANGLE_DAY = Mathf.Sin( 5.0f * Mathf.Deg2Rad );		// We start entering night 5° above the horizon
	protected static readonly float	DAY_NIGHT_SHIFT_SMOOTH_ANGLE_NIGHT = Mathf.Sin( -15.0f * Mathf.Deg2Rad );	// We are fully at night 15° below the horizon

	protected float			m_DayNight = 0.0f;	// A value in [0,1] where 0 is day, 1 is night

	/// <summary>
	/// This is the default luminance adaptation routine
	/// It slowly adapts to the current luminance over time so changes are not abrupt and unnatural.
	/// It also has a different behaviour at night where luminance adaptation time is adapted more slowly
	///  toward a much lower bottom limit (scotopic vision) and the environment shows a slightly blue-ish tint shift.
	/// 
	/// If you're not satisfied with this purely empirical function then you can subscribe to the
	///	 CustomLuminanceAdaptation event and write your own using this one as a model
	/// </summary>
	protected void	PerformDefaultLuminanceAdaptation()
	{
		float	Dt = NuajTime.UnityDeltaTime;

		// Check if it's day or night based on Sun's elevation above the horizon
		m_DayNight = Mathf.Clamp01( 1.0f - Vector3.Dot( SunDirection, m_PlanetNormal ) );

		// Adaptation speed slows down at night
		float	AdaptationSpeed = Mathf.Lerp( m_ToneMappingAdaptationSpeedAtDay, m_ToneMappingAdaptationSpeedAtNight, m_DayNight );
		float	LastFrameLuminance = Vector3.Dot( m_PreviousFrameLuminance, LUMINANCE );
		float	TemporalAdaptation = Mathf.Lerp( LastFrameLuminance, m_ImageLuminance, 1.0f - Mathf.Pow( 1.0f - AdaptationSpeed, Dt ) );

		// Adaptation low limit is higher during day
		float	MinLuminance = Mathf.Lerp( m_ToneMappingMinLuminanceAtDay, m_ToneMappingMinLuminanceAtNight, m_DayNight );
		float	MaxLuminance = Mathf.Lerp( m_ToneMappingMaxLuminanceAtDay, m_ToneMappingMaxLuminanceAtNight, m_DayNight );
		TemporalAdaptation = Mathf.Clamp( TemporalAdaptation, MinLuminance, MaxLuminance );

		// Account for blue shift
		Vector3	Tint = Vector3.Lerp( Vector3.one, new Vector3( 0.9f, 0.95f, 1.0f ), m_DayNight );

		m_CurrentAdaptationLuminance = TemporalAdaptation * Tint;
		Nuaj.Help.LogDebug( "NuajManager.LuminanceAdaptation() => Luminance " + m_CurrentAdaptationLuminance + " (Day/Night = " + m_DayNight + " => Min/Max = " + MinLuminance + "/" + MaxLuminance + ")" );
	}

	#endregion

	#region Default HDR->Unity Adaptation

	// You will find here the default methods to convert the current Sun light and average ambient sky light into useable Unity colors
	//
	// If you are not satisfied with these purely empirical functions, you can disable NuajDrivesSunAmbientColor
	//	and NuajDrivesSunDirectionalColor and compute the colors yourself
	//

	/// <summary>
	/// This is a simple conversion from a physical sun color to a nice looking Unity light setup
	/// (this is mainly an empirical formula)
	/// </summary>
	/// <param name="_SunColor"></param>
	/// <param name="_Light"></param>
	public void	ConvertSunColorToUnityLight( Vector3 _SunColor, Light _Light )
	{
		if ( _Light == null )
			return;

		if ( m_bSceneIsHDR )
		{	// Simply use as-is, no need for tone mapping
			Help.Vec3ToLight( _SunColor, _Light );
		}
		else
		{
			Vector3	ToneMappedSunColor = ToneMap( _SunColor );
			Help.Vec3ToLight( ToneMappedSunColor, _Light );
		}
		_Light.intensity *= m_UnitySunColorFactor;
	}

	/// <summary>
	/// This is a simple conversion from a physical ambient sky color to a nice looking Unity ambient light setup
	/// (this is mainly an empirical formula)
	/// </summary>
	/// <param name="_AmbientSky"></param>
	/// <returns></returns>
	public Color	ConvertAmbientSkyColorToUnityAmbient( Vector3 _AmbientSky )
	{
		if ( m_bSceneIsHDR )
			return m_UnityAmbientColorFactor * Help.Vec3ToColor( _AmbientSky );	// Return as-is...

		// Tone map
		Vector3	AmbientSkyLDR = ToneMap( _AmbientSky );

		AmbientSkyLDR *= m_UnityAmbientColorFactor;
		AmbientSkyLDR = Vector3.Min( AmbientSkyLDR, 1.0f * Vector3.one );	// Don't go brighter than white !
		Color	Result = Help.Vec3ToColor( AmbientSkyLDR );

		return Result;
	}

	#endregion

	#region Shadow Map Management

	protected void	InitializeShadowMap()
	{
		DestroyShadowMap();
		m_RTShadowMap = Help.CreateRT( "Global ShadowMap", m_ShadowMapSize, m_ShadowMapSize, RenderTextureFormat.ARGBHalf, FilterMode.Bilinear, TextureWrapMode.Clamp );
	}

	protected void	DestroyShadowMap()
	{
		Help.SafeDestroy( ref m_RTShadowMap );
	}

	/// <summary>
	/// The shadow map is a standard planar shadow map defined in light plane.
	/// We need to retrieve the boundaries of the rectangle in light plane that 
	///  encompasses the visible scene.
	/// The visible scene is defined as the intersection of the camera frustum (with a limited far plane)
	///  and the scene's AABBox provided as a parameter
	/// </summary>
	/// <param name="_CloudAltitudeMaxKm"></param>
	protected void		PrepareShadowMap( float _CloudAltitudeMaxKm )
	{
		//////////////////////////////////////////////////////////////////////////
		// Compute camera frustum's corners into light space & build bounding rectangle
		float	TanHalfFOVx = m_CameraData.x;
		float	TanHalfFOVy = m_CameraData.y;

		Vector3[]	CameraCorners = new Vector3[]
		{
			Vector3.zero,
			new Vector3( -TanHalfFOVx, +TanHalfFOVy, -1.0f ),
			new Vector3( -TanHalfFOVx, -TanHalfFOVy, -1.0f ),
			new Vector3( +TanHalfFOVx, -TanHalfFOVy, -1.0f ),
			new Vector3( +TanHalfFOVx, +TanHalfFOVy, -1.0f ),
		};
		
		float	CloudRadiusKm = m_PlanetRadiusKm + _CloudAltitudeMaxKm;

		Matrix4x4	World2Sun = Matrix4x4.identity;
		Vector3		View = m_Camera2World.GetColumn( 2 );
		Vector3		Right = Vector3.Cross( View, m_SunDirection );
		if ( Right.sqrMagnitude < 1e-8f )
			World2Sun = m_World2Sun;
		else
		{
			Right = Right.normalized;
			Vector3	Up = Vector3.Cross( m_SunDirection, Right );

			World2Sun.SetColumn( 0, Help.Vec3ToVec4( Right, 0.0f ) );
			World2Sun.SetColumn( 1, Help.Vec3ToVec4( Up, 0.0f ) );
			World2Sun.SetColumn( 2, Help.Vec3ToVec4( m_SunDirection, 0.0f ) );
			World2Sun.SetColumn( 3, Help.Vec3ToVec4( m_PlanetCenterKm, 1.0f ) );

			World2Sun = World2Sun.inverse;
		}


		// Transform corners into WORLD space
		for ( int CornerIndex=0; CornerIndex < CameraCorners.Length; CornerIndex++ )
			CameraCorners[CornerIndex] = m_WorldUnit2Kilometer * m_Camera2World.MultiplyPoint( m_ShadowDistanceFar * CameraCorners[CornerIndex] );

		// Clip camera frustum's polygons with highest cloud sphere
		int[][]	FrustumPolygons = new int[5][]
		{
			// 4 side triangles
			new int[] { 0, 1, 2 },
			new int[] { 0, 2, 3 },
			new int[] { 0, 3, 4 },
			new int[] { 0, 4, 1 },
			// Far quad
			new int[] { 1, 2, 3, 4 },
		};

		List<Vector3>	ClippedCorners = new List<Vector3>();

		float	CloudRadiusFactor = Mathf.Lerp( 1.0f, 1.002f, Mathf.Clamp01( 2.0f * Vector3.Dot( m_SunDirection, m_PlanetNormal ) ) );
		for ( int PolygonIndex=0; PolygonIndex < 5; PolygonIndex++ )
			ComputePolygonIntersection( CameraCorners, FrustumPolygons[PolygonIndex], CloudRadiusFactor * CloudRadiusKm, ClippedCorners );

		// Project into light space
		Vector4	BoundingRectangle = +float.MaxValue * new Vector4( 1, 1, -1, -1 );
		for ( int CornerIndex=0; CornerIndex < ClippedCorners.Count; CornerIndex++ )
		{
			// Transform first into world space
			Vector3	WorldCornerKm = ClippedCorners[CornerIndex];

			// Then transform into light space
			Vector3	CornerLight = World2Sun.MultiplyPoint( WorldCornerKm );
			
			// Then update bounding rectangle
			BoundingRectangle.x = Math.Min( BoundingRectangle.x, CornerLight.x );
			BoundingRectangle.z = Math.Max( BoundingRectangle.z, CornerLight.x );
			BoundingRectangle.y = Math.Min( BoundingRectangle.y, CornerLight.y );
			BoundingRectangle.w = Math.Max( BoundingRectangle.w, CornerLight.y );
		}


		//////////////////////////////////////////////////////////////////////////
		// Build projection matrix to transform light space positions into shadow UV
		float	ScaleX = 1.0f / (BoundingRectangle.z - BoundingRectangle.x);
		float	ScaleY = 1.0f / (BoundingRectangle.w - BoundingRectangle.y);

		float	OffsetX = -BoundingRectangle.x * ScaleX;
		float	OffsetY = -BoundingRectangle.y * ScaleY;

		Matrix4x4	Sun2UV = Matrix4x4.identity;
		Sun2UV.SetColumn( 0, new Vector4( ScaleX, 0, 0, 0 ) );
		Sun2UV.SetColumn( 1, new Vector4( 0, ScaleY, 0, 0 ) );
		Sun2UV.SetColumn( 2, new Vector4( 0, 0, 1, 0 ) );
		Sun2UV.SetColumn( 3, new Vector4( OffsetX, OffsetY, 0, 1 ) );

		// Build the WORLD->SHADOW transform
		m_World2ShadowMap = Sun2UV * World2Sun;
		m_ShadowMap2World = m_World2ShadowMap.inverse;

		// Setup global shadow map parameters
		SetupShadowMapData();
	}

	/// <summary>
	/// Computes the intersection of the provided polygon with the sphere of highest cloud altitude
	/// The returned clipped polygon is the polygon standing below the clouds
	/// </summary>
	/// <param name="_CameraCorners">Camera frustum corners</param>
	/// <param name="_PolygonEdges"></param>
	/// <param name="_SphereRadiusKm"></param>
	/// <param name="_ClippedPolygons"></param>
	protected void		ComputePolygonIntersection( Vector3[] _CameraCorners, int[] _PolygonEdges, float _SphereRadiusKm, List<Vector3> _ClippedPolygons )
	{
		Vector3	StartCorner;
		float	StartRadiusKm;
		Vector3	EndCorner = _CameraCorners[_PolygonEdges[_PolygonEdges.Length-1]];
		float	EndRadiusKm = (EndCorner - m_PlanetCenterKm).magnitude;
		for ( int EdgeIndex=0; EdgeIndex < _PolygonEdges.Length; EdgeIndex++ )
		{
			StartCorner = EndCorner;
			StartRadiusKm = EndRadiusKm;
			EndCorner = _CameraCorners[_PolygonEdges[EdgeIndex]];
			EndRadiusKm = (EndCorner - m_PlanetCenterKm).magnitude;

			if ( StartRadiusKm > _SphereRadiusKm && EndRadiusKm > _SphereRadiusKm )
				continue;	// No intersection and the segment is entirely above the sphere so don't store anything...
			if ( StartRadiusKm <= _SphereRadiusKm && EndRadiusKm <= _SphereRadiusKm )
			{	// The segment is entirely below the sphere so store only start corner...
				_ClippedPolygons.Add( StartCorner );
				continue;
			}

			Vector3	D = EndCorner - StartCorner;
			float	t0, t1;
			if ( !Help.ComputeSphereIntersection( ref StartCorner, ref D, ref m_PlanetCenterKm, _SphereRadiusKm, out t0, out t1 ) )
			{	// WTH ??
//				throw new Exception( "No intersection whereas there should be !" );
				continue;
			}

			if ( StartRadiusKm <= _SphereRadiusKm && EndRadiusKm > _SphereRadiusKm )
			{	// Segment exits the sphere : store only start corner & intersection
				_ClippedPolygons.Add( StartCorner );
				_ClippedPolygons.Add( StartCorner + t1 * D );
			}
			else
			{	// Segment enters the sphere : store only intersection
				_ClippedPolygons.Add( StartCorner + t0 * D );
			}
		}
	}

	/// <summary>
	/// Assigns the global shadow map variables
	/// </summary>
	internal void	SetupShadowMapData()
	{
		NuajMaterial.SetGlobalVector( "_ShadowAltitudesMinKm", m_ShadowMapAltitudesMinKm );
		NuajMaterial.SetGlobalVector( "_ShadowAltitudesMaxKm", m_ShadowMapAltitudesMaxKm );
		NuajMaterial.SetGlobalMatrix( "_NuajShadow2World", m_ShadowMap2World );
		NuajMaterial.SetGlobalMatrix( "_NuajWorld2Shadow", m_World2ShadowMap );
	}

	#endregion

	#region Layers Ordering

	/// <summary>
	/// Computes the ordering of layers
	/// When tracing through cloud layers at a given camera altitude, there are 2 kinds of scenarii we can think of for the camera rays :
	///		* They either go up through layers above
	///		* Or they go down through layers below
	///
	/// What we're doing here is determining the order of the layers in each 2 cases and the way to distinguish between the cases.
	/// We are then able to feed the sky materials a set of swizzle vectors that will be used to order layers, as well as the altitude
	///  of the layer to test against to check if viewing "up or down".
	/// </summary>
	/// <param name="_bHasFog">True if there is a fog layer</param>
	protected void	ComputeLayersOrder( bool _bHasFog )
	{
 		Vector3	CameraPositionKm = m_WorldUnit2Kilometer * m_Camera2World.GetColumn( 3 );
		float	CameraAltitudeKm = Vector3.Magnitude( CameraPositionKm - m_PlanetCenterKm ) - m_PlanetRadiusKm;

		int		CaseLayer = -1;
		int		GodRaysLayerUp = _bHasFog ? 1 : 0, GodRaysLayerDown = _bHasFog ? 3 : 4;

		int[]	LayersTraceOrderUpExit = new int[4];
		int[]	LayersTraceOrderDownEnter = new int[4];
		if ( CameraAltitudeKm < m_ShadowMapAltitudesMinKm.x )
		{	// Below lowest layer
			LayersTraceOrderUpExit[0] = 0;		LayersTraceOrderUpExit[1] = 1;		LayersTraceOrderUpExit[2] = 2;		LayersTraceOrderUpExit[3] = 3;
			LayersTraceOrderDownEnter[0] = -1;	LayersTraceOrderDownEnter[1] = -1;	LayersTraceOrderDownEnter[2] = -1;	LayersTraceOrderDownEnter[3] = -1;
			GodRaysLayerDown = GodRaysLayerUp;
		}
		else if ( CameraAltitudeKm < m_ShadowMapAltitudesMaxKm.x )
		{	// Inside lowest layer
			CaseLayer = 0;
			LayersTraceOrderUpExit[0] = 0;		LayersTraceOrderUpExit[1] = 1;		LayersTraceOrderUpExit[2] = 2;		LayersTraceOrderUpExit[3] = 3;
			LayersTraceOrderDownEnter[0] = 0;	LayersTraceOrderDownEnter[1] = -1;	LayersTraceOrderDownEnter[2] = -1;	LayersTraceOrderDownEnter[3] = -1;
		}
		else if ( CameraAltitudeKm < m_ShadowMapAltitudesMinKm.y )
		{	// Below second layer
			CaseLayer = 0;
			LayersTraceOrderUpExit[0] = 1;		LayersTraceOrderUpExit[1] = 2;		LayersTraceOrderUpExit[2] = 3;		LayersTraceOrderUpExit[3] = -1;
			LayersTraceOrderDownEnter[0] = 0;	LayersTraceOrderDownEnter[1] = -1;	LayersTraceOrderDownEnter[2] = -1;	LayersTraceOrderDownEnter[3] = -1;
		}
		else if ( CameraAltitudeKm < m_ShadowMapAltitudesMaxKm.y )
		{	// Inside second layer
			CaseLayer = 0;
			LayersTraceOrderUpExit[0] = 1;		LayersTraceOrderUpExit[1] = 2;		LayersTraceOrderUpExit[2] = 3;		LayersTraceOrderUpExit[3] = -1;
			LayersTraceOrderDownEnter[0] = 1;	LayersTraceOrderDownEnter[1] = 0;	LayersTraceOrderDownEnter[2] = -1;	LayersTraceOrderDownEnter[3] = -1;
		}
		else if ( CameraAltitudeKm < m_ShadowMapAltitudesMinKm.z )
		{	// Below third layer
			CaseLayer = 1;
			LayersTraceOrderUpExit[0] = 2;		LayersTraceOrderUpExit[1] = 3;		LayersTraceOrderUpExit[2] = -1;		LayersTraceOrderUpExit[3] = -1;
			LayersTraceOrderDownEnter[0] = 1;	LayersTraceOrderDownEnter[1] = 0;	LayersTraceOrderDownEnter[2] = -1;	LayersTraceOrderDownEnter[3] = -1;
		}
		else if ( CameraAltitudeKm < m_ShadowMapAltitudesMaxKm.z )
		{	// Inside third layer
			CaseLayer = 1;
			LayersTraceOrderUpExit[0] = 2;		LayersTraceOrderUpExit[1] = 3;		LayersTraceOrderUpExit[2] = -1;		LayersTraceOrderUpExit[3] = -1;
			LayersTraceOrderDownEnter[0] = 2;	LayersTraceOrderDownEnter[1] = 1;	LayersTraceOrderDownEnter[2] = 0;	LayersTraceOrderDownEnter[3] = -1;
		}
		else if ( CameraAltitudeKm < m_ShadowMapAltitudesMinKm.w )
		{	// Below fourth layer
			CaseLayer = 2;
			LayersTraceOrderUpExit[0] = 3;		LayersTraceOrderUpExit[1] = -1;		LayersTraceOrderUpExit[2] = -1;		LayersTraceOrderUpExit[3] = -1;
			LayersTraceOrderDownEnter[0] = 2;	LayersTraceOrderDownEnter[1] = 1;	LayersTraceOrderDownEnter[2] = 0;	LayersTraceOrderDownEnter[3] = -1;
		}
		else if ( CameraAltitudeKm < m_ShadowMapAltitudesMaxKm.w )
		{	// Inside fourth layer
			CaseLayer = 2;
			LayersTraceOrderUpExit[0] = 3;		LayersTraceOrderUpExit[1] = -1;		LayersTraceOrderUpExit[2] = -1;		LayersTraceOrderUpExit[3] = -1;
			LayersTraceOrderDownEnter[0] = 3;	LayersTraceOrderDownEnter[1] = 2;	LayersTraceOrderDownEnter[2] = 1;	LayersTraceOrderDownEnter[3] = 0;
		}
		else
		{	// Above fourth layer
			CaseLayer = 3;
			LayersTraceOrderUpExit[0] = -1;		LayersTraceOrderUpExit[1] = -1;		LayersTraceOrderUpExit[2] = -1;	LayersTraceOrderUpExit[3] = -1;
			LayersTraceOrderDownEnter[0] = 3;	LayersTraceOrderDownEnter[1] = 2;	LayersTraceOrderDownEnter[2] = 1;	LayersTraceOrderDownEnter[3] = 0;
		}

		// Build swizzles
		m_LayerOrderingCaseSwizzle = BuildSwizzle( CaseLayer );	// This will give the layer index to use to check if we're viewing up or down
		m_LayerOrderingSwizzleExitUp0 = BuildSwizzle( LayersTraceOrderUpExit[0] );
		m_LayerOrderingSwizzleExitUp1 = BuildSwizzle( LayersTraceOrderUpExit[1] );
		m_LayerOrderingSwizzleExitUp2 = BuildSwizzle( LayersTraceOrderUpExit[2] );
		m_LayerOrderingSwizzleExitUp3 = BuildSwizzle( LayersTraceOrderUpExit[3] );
		m_LayerOrderingSwizzleEnterDown0 = BuildSwizzle( LayersTraceOrderDownEnter[0] );
		m_LayerOrderingSwizzleEnterDown1 = BuildSwizzle( LayersTraceOrderDownEnter[1] );
		m_LayerOrderingSwizzleEnterDown2 = BuildSwizzle( LayersTraceOrderDownEnter[2] );
		m_LayerOrderingSwizzleEnterDown3 = BuildSwizzle( LayersTraceOrderDownEnter[3] );
		m_LayerOrderingIsGodRaysLayerUp = BuildSwizzle( GodRaysLayerUp );
		m_LayerOrderingIsGodRaysLayerDown = BuildSwizzle( GodRaysLayerDown );
		m_LayerOrderingIsGodRaysLayerUpDown = new Vector2( GodRaysLayerUp == 4 ? 1.0f : 0.0f, GodRaysLayerDown == 4 ? 1.0f : 0.0f );
	}

	protected Vector4	BuildSwizzle( int _Index )
	{
		Vector4	Result = Vector4.zero;
		switch ( _Index )
		{
			case 0: Result.x = 1.0f; break;
			case 1: Result.y = 1.0f; break;
			case 2: Result.z = 1.0f; break;
			case 3: Result.w = 1.0f; break;
		}
		return Result;
	}

	internal void		SetupLayerOrderingData( NuajMaterial _Material )
	{
		_Material.SetVector( "_CaseSwizzle", m_LayerOrderingCaseSwizzle );
		_Material.SetVector( "_SwizzleEnterDown0", m_LayerOrderingSwizzleEnterDown0 );
		_Material.SetVector( "_SwizzleEnterDown1", m_LayerOrderingSwizzleEnterDown1 );
		_Material.SetVector( "_SwizzleEnterDown2", m_LayerOrderingSwizzleEnterDown2 );
		_Material.SetVector( "_SwizzleEnterDown3", m_LayerOrderingSwizzleEnterDown3 );
		_Material.SetVector( "_SwizzleExitUp0", m_LayerOrderingSwizzleExitUp0 );
		_Material.SetVector( "_SwizzleExitUp1", m_LayerOrderingSwizzleExitUp1 );
		_Material.SetVector( "_SwizzleExitUp2", m_LayerOrderingSwizzleExitUp2 );
		_Material.SetVector( "_SwizzleExitUp3", m_LayerOrderingSwizzleExitUp3 );
		_Material.SetVector( "_IsGodRaysLayerUp", m_LayerOrderingIsGodRaysLayerUp );
		_Material.SetVector( "_IsGodRaysLayerDown", m_LayerOrderingIsGodRaysLayerDown );
		_Material.SetVector( "_IsGodRaysLayerUpDown", m_LayerOrderingIsGodRaysLayerUpDown );
	}

	protected Vector4	m_LayerOrderingCaseSwizzle;	
	protected Vector4	m_LayerOrderingSwizzleExitUp0;
	protected Vector4	m_LayerOrderingSwizzleExitUp1;
	protected Vector4	m_LayerOrderingSwizzleExitUp2;
	protected Vector4	m_LayerOrderingSwizzleExitUp3;
	protected Vector4	m_LayerOrderingSwizzleEnterDown0;
	protected Vector4	m_LayerOrderingSwizzleEnterDown1;
	protected Vector4	m_LayerOrderingSwizzleEnterDown2;
	protected Vector4	m_LayerOrderingSwizzleEnterDown3;
	protected Vector4	m_LayerOrderingIsGodRaysLayerUp, m_LayerOrderingIsGodRaysLayerDown;
	protected Vector2	m_LayerOrderingIsGodRaysLayerUpDown;

	#endregion

	#region Light Cookie Management

	/// <summary>
	/// Creates the light cookie texture
	/// </summary>
	protected void	InitializeLightCookie()
	{
		DestroyLightCookie();

		if ( m_bCastShadowUsingLightCookie )
			m_RTLightCookie = Help.CreateRT( "Light Cookie", m_LightCookieTextureSize, m_LightCookieTextureSize, RenderTextureFormat.ARGB32, FilterMode.Bilinear, TextureWrapMode.Repeat );

		// Assign cookie to light
		if ( m_Sun != null && m_Sun.light != null )
			m_Sun.light.cookie = m_RTLightCookie;
	}

	/// <summary>
	/// Destroys the light cookie texture
	/// </summary>
	protected void	DestroyLightCookie()
	{
		Help.SafeDestroy( ref m_RTLightCookie );
	}

	#endregion

	#region Lightning Bolts Management

	/// <summary>
	/// Updates global variables for lightning bolts
	/// </summary>
	protected void	UpdateLightningValues()
	{
		NuajLightningBolt	Bolt = null;
		if ( m_LightningBolt0 != null && m_LightningBolt0.active && (Bolt = m_LightningBolt0.GetComponent<NuajLightningBolt>()) != null && Bolt.enabled )
		{
			Matrix4x4	M = m_LightningBolt0.transform.localToWorldMatrix;
			NuajMaterial.SetGlobalVector( "_NuajLightningPosition00", m_WorldUnit2Kilometer * M.MultiplyPoint( Bolt.P0 ) );
			NuajMaterial.SetGlobalVector( "_NuajLightningPosition01", m_WorldUnit2Kilometer * M.MultiplyPoint( Bolt.P1 ) );
			NuajMaterial.SetGlobalVector( "_NuajLightningColor0", Bolt.ShaderColor );
			NuajMaterial.SetGlobalFloat( "_NuajLightningInvSqLengthKm0", Bolt.InvSqLength * m_Kilometer2WorldUnit * m_Kilometer2WorldUnit );
		}
		else
		{
			NuajMaterial.SetGlobalVector( "_NuajLightningColor0", Vector3.zero );
		}

		if ( m_LightningBolt1 != null && m_LightningBolt1.active && (Bolt = m_LightningBolt1.GetComponent<NuajLightningBolt>()) != null && Bolt.enabled )
		{
			Matrix4x4	M = m_LightningBolt1.transform.localToWorldMatrix;
			NuajMaterial.SetGlobalVector( "_NuajLightningPosition10", m_WorldUnit2Kilometer * M.MultiplyPoint( Bolt.P0 ) );
			NuajMaterial.SetGlobalVector( "_NuajLightningPosition11", m_WorldUnit2Kilometer * M.MultiplyPoint( Bolt.P1 ) );
			NuajMaterial.SetGlobalVector( "_NuajLightningColor1", Bolt.ShaderColor );
			NuajMaterial.SetGlobalFloat( "_NuajLightningInvSqLengthKm1", Bolt.InvSqLength * m_Kilometer2WorldUnit * m_Kilometer2WorldUnit );
		}
		else
		{
			NuajMaterial.SetGlobalVector( "_NuajLightningColor1", Vector3.zero );
		}
	}

	#endregion

	#region Helpers

	/// <summary>
	/// Clears a render target with a solid color
	/// </summary>
	/// <param name="_Target"></param>
	/// <param name="_SolidColor"></param>
	internal void	ClearTarget( RenderTexture _Target, Vector4 _SolidColor )
	{
		m_MaterialClearTexture.SetVector( "_ClearColor", _SolidColor );
		m_MaterialClearTexture.SetFloat( "_bUseSolidColor", 1 );
		m_MaterialClearTexture.Blit( null, _Target, 0 );
	}

	/// <summary>
	/// Clears a render target with a texture
	/// </summary>
	/// <param name="_Target"></param>
	/// <param name="_SourceTexture"></param>
	internal void	ClearTarget( RenderTexture _Target, NuajTexture2D _SourceTexture )
	{
		m_MaterialClearTexture.SetTexture( "_ClearTexture", _SourceTexture, true );
		m_MaterialClearTexture.SetFloat( "_bUseSolidColor", 0 );
		m_MaterialClearTexture.SetFloat( "_bInvertTextureAlpha", 0 );
		m_MaterialClearTexture.Blit( null, _Target, 0 );
	}

	/// <summary>
	/// Clears a scattering render target with 0 for scattering and 1 for extinction
	/// </summary>
	/// <param name="_Target"></param>
	internal void	ClearScatteringExtinction( RenderTexture _Target )
	{
		m_MaterialClearTexture.Blit( null, _Target, 1 );
	}

	/// <summary>
	/// Downscales the Z-Buffer to the appropriate resolution
	/// NOTE: Asking for 2 Z-Buffers at the same downscale factor will trigger only 1 computation so it's advised to use the same scale factors whenever possible
	/// </summary>
	/// <param name="_DownScaleFactor">The downscale factor</param>
	/// <returns>The downscaled Z-Buffer</returns>
	internal RenderTexture	DownScaleZBuffer( float _DownScaleFactor )
	{
		if ( m_CachedDownScaledZBuffers.ContainsKey( _DownScaleFactor ) )
		{
			return m_CachedDownScaledZBuffers[_DownScaleFactor];	// We already have one in store !
		}

		// Compute downscaled with & height
		int	Width = (int) Math.Floor( _DownScaleFactor * m_ScreenWidth );
		Width = Math.Max( 32, Width );

		int	Height = (int) Math.Floor( _DownScaleFactor * m_ScreenHeight );
		Height = Math.Max( 32, Height );

		// Create the downscaled target
		RenderTexture	Result = Help.CreateTempRT( Width, Height, RenderTextureFormat.ARGBHalf, FilterMode.Bilinear, TextureWrapMode.Clamp );
		if ( Result == null )
			throw new Exception( "Received a NULL ZBuffer !" );
		m_CachedDownScaledZBuffers[_DownScaleFactor] = Result;

		// Downscale...
		m_MaterialDownScaleZBuffer.SetVector( "_dUV", new Vector4( 0.5f * _DownScaleFactor / m_ScreenWidth, 0.5f * _DownScaleFactor / m_ScreenHeight, 0.0f, 0.0f ) );
		m_MaterialDownScaleZBuffer.Blit( null, Result, 0 );

		return Result;
	}

	protected Dictionary<float,RenderTexture>	m_CachedDownScaledZBuffers = new Dictionary<float,RenderTexture>();

	/// <summary>
	/// Destroys an object if not already null, then nullifies the reference
	/// </summary>
	/// <typeparam name="T"></typeparam>
	/// <param name="_Object"></param>
	internal static void	SafeDestroy<T>( ref T _Object ) where T:UnityEngine.Object
	{
		if ( _Object == null )
			return;

		DestroyImmediate( _Object );
		_Object = null;
	}

	/// <summary>
	/// Destroys an object if not already null, then nullifies the reference
	/// </summary>
	/// <typeparam name="T"></typeparam>
	/// <param name="_Object"></param>
	internal static void	SafeDestroyNuaj<T>( ref T _Object ) where T:class,IDisposable
	{
		if ( _Object == null )
			return;

		_Object.Dispose();
		_Object = null;
	}

	/// <summary>
	/// Performs rendering of a 1x1 value to a CPU-readable target
	/// </summary>
	/// <param name="_Source">The source texture to render</param>
	/// <param name="_ValueIndex">The index of the value to write in [0,3] (the target supports at most 4 readable pixels)</param>
	/// <param name="_Material">The material to use for rendering</param>
	/// <param name="_PassIndex">The index of the pass for rendering</param>
	internal void			RenderToCPU( Texture _Source, int _ValueIndex, NuajMaterial _Material, int _PassIndex )
	{
#if USE_CPU_READBACK_TRIPLE_BUFFER
		RenderTexture.active = m_GPU2CPURenderTextures[2];	// Render in the last buffer that will be read back 2 frames from now
#else
		RenderTexture.active = m_GPU2CPURenderTextures[0];	// Render in the first buffer that will be read back at the end of this frame
#endif
 		_Material.SetTextureRAW( "_MainTex", _Source );
 		_Material.SetPass( _PassIndex );

		// Render a single pixel at the specified X coordinate within the render texture
		GL.PushMatrix();
		GL.LoadPixelMatrix();
		GL.Viewport( new Rect( _ValueIndex, 0, 1, 1 ) );

		GL.Begin( GL.QUADS );
		// Here, I had to make sure we draw a huuuuge quad otherwise it misses pixels on ATI !
		GL.Vertex3(0, 0, 0);
		GL.Vertex3(0, 1000, 0);
		GL.Vertex3(1000, 1000, 0);
		GL.Vertex3(1000, 0, 0);
		GL.End();

		GL.PopMatrix();

		RenderTexture.active = null;
		m_WrittenCPUDataCount++;
	}

	/// <summary>
	/// Reads back a GPU data
	/// </summary>
	/// <param name="_ValueIndex">The index of the value to read back in [0,3]</param>
	/// <returns></returns>
	internal Color			CPUReadBack( int _ValueIndex )
	{
		return m_CPUReadBack != null && m_CPUReadBack.Length > _ValueIndex ? m_CPUReadBack[_ValueIndex] : Color.black;
	}

	#region Error/Warning States

	/// <summary>
	/// Enters error mode. The module is then disabled and can't render anymore
	/// </summary>
	/// <param name="_Error"></param>
	protected void			EnterErrorState( string _Error )
	{
		if ( m_bInErrorState )
			return;	// Already in error state !

		m_bInErrorState = true;
		m_Error = _Error;

		Nuaj.Help.LogWarning( "Nuaj' Manager cannot work as it entered error state with :\r\n" + _Error );

		// Notify
		if ( ErrorStateChanged != null )
			ErrorStateChanged( this, EventArgs.Empty );
	}

	/// <summary>
	/// Exits error mode. The module is then enabled again
	/// </summary>
	protected void			ExitErrorState()
	{
		if ( !m_bInErrorState )
			return;	// Not in error state !

		m_bInErrorState = false;

		// Notify
		if ( ErrorStateChanged != null )
			ErrorStateChanged( this, EventArgs.Empty );
	}

	/// <summary>
	/// Enters warning mode. The module is still enabled but may not render properly
	/// </summary>
	/// <param name="_Warning"></param>
	protected void			EnterWarningState( string _Warning )
	{
		if ( m_bInErrorState )
			return;	// Already in warning state !

		m_bInWarningState = true;
		m_Warning = _Warning;

		Nuaj.Help.LogWarning( "Nuaj' Manager cannot work as it entered error state with :\r\n" + _Warning );

		// Notify
		if ( WarningStateChanged != null )
			WarningStateChanged( this, EventArgs.Empty );
	}

	/// <summary>
	/// Exits warning mode. The module should render properly again
	/// </summary>
	protected void			ExitWarningState()
	{
		if ( !m_bInWarningState )
			return;	// Not in warning state !

		m_bInWarningState = false;

		// Notify
		if ( WarningStateChanged != null )
			WarningStateChanged( this, EventArgs.Empty );
	}

	#endregion

	/// <summary>
	/// Updates all the cached values
	/// </summary>
	protected void	UpdateCachedValues()
	{
		m_ImageScaler.AverageOrMax = m_LuminanceAverageOrMax;
		m_ImageLuminance = 1.0f;
		m_PreviousFrameLuminance = m_CurrentAdaptationLuminance = Vector3.one;

		UpdateCameraCachedValues();
		UpdateLightingCachedValues();
		UpdatePlanetCachedValues();
	}

	/// <summary>
	/// Update cached values
	/// </summary>
	protected void	UpdateCameraCachedValues()
	{
		NuajMaterial.SetGlobalVector( "_CameraData", m_CameraData );
		NuajMaterial.SetGlobalMatrix( "_Camera2World", m_Camera2World );
		NuajMaterial.SetGlobalMatrix( "_World2Camera", m_World2Camera );
	}

	/// <summary>
	/// Update cached values
	/// </summary>
	protected void	UpdateLightingCachedValues()
	{
		m_SunColor = m_SunIntensity * new Vector3( m_SunHue.r, m_SunHue.g, m_SunHue.b );

		// Setup global shader values
		NuajMaterial.SetGlobalVector( "_SunColor", m_SunColor );	// This is the _untainted_ Sun color for computations (not affected by atmosphere)
		NuajMaterial.SetGlobalFloat( "_SunLuminance", m_SunIntensity );
		NuajMaterial.SetGlobalVector( "_SunDirection", m_SunDirection );
		NuajMaterial.SetGlobalVector( "_AmbientNightSky", m_AmbientNightSky );
	}

	/// <summary>
	/// Update cached values
	/// </summary>
	protected void	UpdatePlanetCachedValues()
	{
		// Rebuild planet tangent space
		m_PlanetBiTangent = Vector3.Cross(	Vector3.right,	// TODO : choose an appropriate tangent space
											m_PlanetNormal ).normalized;
		m_PlanetTangent = Vector3.Cross( m_PlanetNormal, m_PlanetBiTangent );

		m_Kilometer2WorldUnit = 1.0f / m_WorldUnit2Kilometer;

		// Setup global shader values
		NuajMaterial.SetGlobalVector( "_PlanetCenterKm", m_PlanetCenterKm );
		NuajMaterial.SetGlobalVector( "_PlanetNormal", m_PlanetNormal );
		NuajMaterial.SetGlobalVector( "_PlanetTangent", m_PlanetTangent );
		NuajMaterial.SetGlobalVector( "_PlanetBiTangent", m_PlanetBiTangent );
		NuajMaterial.SetGlobalFloat( "_PlanetRadiusKm", m_PlanetRadiusKm );
		NuajMaterial.SetGlobalFloat( "_PlanetAtmosphereAltitudeKm", m_PlanetAtmosphereAltitudeKm );
		NuajMaterial.SetGlobalFloat( "_PlanetAtmosphereRadiusKm", m_PlanetRadiusKm + m_PlanetAtmosphereAltitudeKm );
		NuajMaterial.SetGlobalFloat( "_WorldUnit2Kilometer", m_WorldUnit2Kilometer );
		NuajMaterial.SetGlobalFloat( "_Kilometer2WorldUnit", m_Kilometer2WorldUnit );
	}

	/// <summary>
	/// Updates global variables for local variations
	/// </summary>
	protected void	UpdateLocalVariationsValues()
	{
		// Grab local coverage value
		Vector4			LocalCoverageOffset, LocalCoverageFactor;
		Matrix4x4		World2LocalCoverage;
		NuajTexture2D	LocalCoverageTexture = null;
		NuajMapLocator	Locator = null;
		if ( m_LocalCoverage != null && m_LocalCoverage.gameObject.active && (Locator = m_LocalCoverage.GetComponent<NuajMapLocator>()) != null )
		{
			LocalCoverageOffset = Locator.Offset;
			LocalCoverageFactor = Locator.Factor;
			LocalCoverageTexture = m_LocalCoverageTexture;
			m_LocalCoverageTexture.Texture = Locator.Texture;
			World2LocalCoverage = Locator.transform.worldToLocalMatrix;
		}
		else
		{	// No locator...
			LocalCoverageOffset = Vector4.zero;
			LocalCoverageFactor = Vector4.one;
			LocalCoverageTexture = m_TextureWhite;
			World2LocalCoverage = Matrix4x4.identity;
		}

		NuajMaterial.SetGlobalVector( "_NuajLocalCoverageOffset", LocalCoverageOffset );
		NuajMaterial.SetGlobalVector( "_NuajLocalCoverageFactor", LocalCoverageFactor );
		NuajMaterial.SetGlobalTexture( "_NuajLocalCoverageTexture", LocalCoverageTexture, false );
		NuajMaterial.SetGlobalMatrix( "_NuajLocalCoverageTransform", World2LocalCoverage );

		// Grab terrain emissive value
		Vector4			TerrainEmissiveOffset, TerrainEmissiveFactor;
		Matrix4x4		World2TerrainEmissive;
		NuajTexture2D	TerrainEmissiveTexture = null;
		Locator = null;
		if ( m_TerrainEmissive != null && m_TerrainEmissive.gameObject.active && (Locator = m_TerrainEmissive.GetComponent<NuajMapLocator>()) != null )
		{
			TerrainEmissiveOffset = Locator.Offset;
			TerrainEmissiveFactor = Locator.Factor;
			TerrainEmissiveTexture = m_TerrainEmissiveTexture;
			m_TerrainEmissiveTexture.Texture = Locator.Texture;
			World2TerrainEmissive = Locator.transform.worldToLocalMatrix;
		}
		else
		{	// No locator...
			TerrainEmissiveOffset = Vector4.zero;
			TerrainEmissiveFactor = Vector4.one;
			TerrainEmissiveTexture = m_TextureEmptyCloud;	// We need alpha=1 for full terrain albedo here...
			World2TerrainEmissive = Matrix4x4.identity;
		}

		NuajMaterial.SetGlobalVector( "_NuajTerrainEmissiveOffset", TerrainEmissiveOffset );
		NuajMaterial.SetGlobalVector( "_NuajTerrainEmissiveFactor", TerrainEmissiveFactor );
		NuajMaterial.SetGlobalTexture( "_NuajTerrainEmissiveTexture", TerrainEmissiveTexture, false );
		NuajMaterial.SetGlobalMatrix( "_NuajTerrainEmissiveTransform", World2TerrainEmissive );

		// Setup terrain albedo
		NuajMaterial.SetGlobalVector( "_NuajTerrainAlbedo", m_TerrainAlbedo.a * Help.ColorToVec3( m_TerrainAlbedo ) );
	}

	void		OnDrawGizmos()
	{
		Help.DrawIcon( transform.position, "Nuaj Icon" );
	}

	#endregion

	#region IComparer<ICloudLayer> Members

	/// <summary>
	/// Compares the altitude of 2 clouds layers for sorting
	/// </summary>
	/// <param name="x"></param>
	/// <param name="y"></param>
	/// <returns></returns>
	public int Compare( ICloudLayer x, ICloudLayer y )
	{
		if ( x.Altitude < y.Altitude )
			return -1;
		else if ( x.Altitude > y.Altitude )
			return 1;
		else
			return 0;
	}

	#endregion

	#endregion

	#region EVENT HANDLERS

	protected void	ModulePerspective_SkyParametersChanged( object sender, EventArgs e )
	{
		UpdateLightingCachedValues();
	}

	#endregion
}
