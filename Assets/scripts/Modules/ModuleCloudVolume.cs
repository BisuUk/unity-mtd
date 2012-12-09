using System;
using System.Collections.Generic;
using UnityEngine;

namespace Nuaj
{
	/// <summary>
	/// This module is responsible for the display of volumetric clouds
	/// </summary>
	[Serializable]
	public class ModuleCloudVolume : ModuleCloudLayerBase
	{
		#region NESTED TYPES

		/// <summary>
		/// A single layer of 3D volumetric clouds
		/// </summary>
		[Serializable]
		public class	CloudLayer : CloudLayerBase
		{
			#region CONSTANTS

			protected const int		ENVIRONMENT_CLOUD_STEPS_COUNT = 8;	// Use less tracing steps for environment...

			// DEFAULT VALUES
			/// <summary>
			/// Default cloud altitude on construction
			/// </summary>
			public const float		DEFAULT_ALTITUDE = 4.0f;
			/// <summary>
			/// Default cloud thickness on construction
			/// </summary>
			public const float		DEFAULT_THICKNESS = 1.4f;
			protected const float	DEFAULT_COVERAGE = -0.2f;
			protected const float	DEFAULT_DENSITY = 0.5f * 1e-3f;
			protected static readonly Color	DEFAULT_COLOR = Color.white;
			protected const float	DEFAULT_TRACE_LIMITER = 0.05f;
			protected const float	DEFAULT_HORIZON_BLEND_START = 40.0f;
			protected const float	DEFAULT_HORIZON_BLEND_END = 100.0f;
			protected const float	DEFAULT_HORIZON_BLEND_VALUE = 1.0f;

			protected const float	DEFAULT_NOISE_TILING = 0.02f;
			protected const float	DEFAULT_FREQ_FACTOR = 2.777f;
			protected const float	DEFAULT_AMPL_FACTOR = 0.5f;
			protected const float	DEFAULT_WIND_FORCE = 0.0f;
			protected static readonly Vector2	DEFAULT_WIND_DIRECTION = Vector2.right;
			protected const float	DEFAULT_EVOLUTION_SPEED = 8.0f;
			protected const float	DEFAULT_ALBEDO = 0.91f;
			protected const float	DEFAULT_DIR_FACTOR = 1.0f;
			protected const float	DEFAULT_ISO_FACTOR = 1.0f;
			protected const float	DEFAULT_ISO_DENSITY = 0.6f;
			protected const float	DEFAULT_ISO_FACTOR_SKY = 4.0f;
			protected const float	DEFAULT_ISO_FACTOR_TERRAIN = 0.05f;
			protected const float	DEFAULT_PHASE_WEIGHT_SF = 0.05f;
			protected const float	DEFAULT_PHASE_WEIGHT_F = 0.05f;
			protected const float	DEFAULT_PHASE_WEIGHT_B = 0.02f;
			protected const float	DEFAULT_PHASE_WEIGHT_S = 0.08f;
			protected const float	DEFAULT_PHASE_ANISOTROPY_SF = 0.95f;
			protected const float	DEFAULT_PHASE_ANISOTROPY_F = 0.8f;
			protected const float	DEFAULT_PHASE_ANISOTROPY_B = -0.4f;
			protected const float	DEFAULT_PHASE_ANISOTROPY_S = -0.2f;
			protected const int		DEFAULT_STEPS_COUNT = 32;
			protected const int		DEFAULT_SHADOW_MAP_SIZE = 512;
			protected const SHADOW_QUALITY	DEFAULT_SHADOW_MAP_QUALITY = SHADOW_QUALITY.DEEP_SHADOW_MAP_TWO_LAYERS;
			protected const bool	DEFAULT_SMOOTH_SHADOW_MAP = true;
			protected const float	DEFAULT_SMOOTH_SIZE = 1.0f;

			#endregion

			#region NESTED TYPES

			/// <summary>
			/// Describes the quality of shadowing to use for the volume cloud.
			/// Volume clouds use an internal shadowing scheme that allow to perform volumetric shadowing through the use of several layers of shadow maps called "deep shadow maps".
			/// You can select either one, two or three layers, each layer coding the shadowing of 4 slices. The more the layers, the more accurate the shadowing of course, but also eats up more memory and time.
			/// </summary>
			public enum		SHADOW_QUALITY
			{
				/// <summary>
				/// A deep shadow map with 1 layer of 4 values (total of 4)
				/// </summary>
				DEEP_SHADOW_MAP_ONE_LAYER,
				/// <summary>
				/// A deep shadow map with 2 layers of 4 values (total of 8)
				/// </summary>
				DEEP_SHADOW_MAP_TWO_LAYERS,
				/// <summary>
				/// A deep shadow map with 3 layers of 4 values (total of 12)
				/// </summary>
				DEEP_SHADOW_MAP_THREE_LAYERS,
			}

			#endregion

			#region FIELDS

			protected ModuleCloudVolume					m_Owner = null;

			// Appearance
			[SerializeField] protected float			m_Coverage = DEFAULT_COVERAGE;
			[SerializeField] protected float			m_Density = DEFAULT_DENSITY;
			[SerializeField] protected Color			m_CloudColor = DEFAULT_COLOR;
			[SerializeField] protected float			m_TraceLimiter = DEFAULT_TRACE_LIMITER;
			[SerializeField] protected float			m_HorizonBlendStart = DEFAULT_HORIZON_BLEND_START;
			[SerializeField] protected float			m_HorizonBlendEnd = DEFAULT_HORIZON_BLEND_END;
			[SerializeField] protected float			m_HorizonBlendValue = DEFAULT_HORIZON_BLEND_VALUE;

			// Noise parameters
			[SerializeField] protected float			m_NoiseTiling = DEFAULT_NOISE_TILING;
			[SerializeField] protected float			m_FrequencyFactor = DEFAULT_FREQ_FACTOR;
			[SerializeField] protected float			m_AmplitudeFactor = DEFAULT_AMPL_FACTOR;

			// Animation
			[SerializeField] protected float			m_WindForce = DEFAULT_WIND_FORCE;
			[SerializeField] protected Vector2			m_WindDirection = DEFAULT_WIND_DIRECTION;
			[SerializeField] protected float			m_EvolutionSpeed = DEFAULT_EVOLUTION_SPEED;

			// Lighting parameters
			[SerializeField] protected float			m_Albedo = DEFAULT_ALBEDO;
			[SerializeField] protected float			m_DirectionalFactor = DEFAULT_DIR_FACTOR;
			[SerializeField] protected float			m_IsotropicFactor = DEFAULT_ISO_FACTOR;
			[SerializeField] protected float			m_IsotropicDensity = DEFAULT_ISO_DENSITY;

			[SerializeField] protected float			m_IsotropicFactorSky = DEFAULT_ISO_FACTOR_SKY;
			[SerializeField] protected float			m_IsotropicFactorTerrain = DEFAULT_ISO_FACTOR_TERRAIN;

				// Phase functions
			[SerializeField] protected float			m_PhaseWeightStrongForward = DEFAULT_PHASE_WEIGHT_SF;
			[SerializeField] protected float			m_PhaseWeightForward = DEFAULT_PHASE_WEIGHT_F;
			[SerializeField] protected float			m_PhaseWeightBackward = DEFAULT_PHASE_WEIGHT_B;
			[SerializeField] protected float			m_PhaseWeightSide = DEFAULT_PHASE_WEIGHT_S;

			[SerializeField] protected float			m_PhaseAnisotropyStrongForward = DEFAULT_PHASE_ANISOTROPY_SF;
			[SerializeField] protected float			m_PhaseAnisotropyForward = DEFAULT_PHASE_ANISOTROPY_F;
			[SerializeField] protected float			m_PhaseAnisotropyBackward = DEFAULT_PHASE_ANISOTROPY_B;
			[SerializeField] protected float			m_PhaseAnisotropySide = DEFAULT_PHASE_ANISOTROPY_S;

			// Rendering quality parameters
			[SerializeField] protected int				m_StepsCount = DEFAULT_STEPS_COUNT;
			[SerializeField] protected int				m_ShadowMapSize = DEFAULT_SHADOW_MAP_SIZE;
			[SerializeField] protected SHADOW_QUALITY	m_ShadowQuality = DEFAULT_SHADOW_MAP_QUALITY;
			[SerializeField] protected bool				m_bSmoothShadowMap = DEFAULT_SMOOTH_SHADOW_MAP;
			[SerializeField] protected float			m_SmoothSize = DEFAULT_SMOOTH_SIZE;


			/////////////////////////////////////////////////////////
			// Textures & Targets
			protected RenderTexture[]			m_RTShadowMaps = null;	// Several layers of deep shadow maps, depending on shadow quality
			protected RenderTexture				m_RTShadowMapEnvSky = null;

			// Internal data
			protected Vector4					m_CloudPosition = Vector4.zero;	// Our very own position accumulators

			protected float						m_SigmaExtinction = 0.0f;
			protected float						m_SigmaScattering = 0.0f;

			#endregion

			#region PROPERTIES

			internal ModuleCloudVolume		Owner
			{
				get { return m_Owner; }
				set
				{
					if ( value == m_Owner )
						return;

					m_Owner = value;
					UpdateCachedValues();
				}
			}

			/// <summary>
			/// Bypass rendering if density or thickness are 0
			/// </summary>
			public override bool			Bypass { get { return m_Density <= 0.0f || m_ThicknessKm <= 0.0f; } }

			/// <summary>
			/// Tells this cloud layer is a volumetric layer
			/// </summary>
			public override bool IsVolumetric		{ get { return true; } }

			#region Rendering

			/// <summary>
			/// Gets or sets the amount of steps of ray-marching for rendering the cloud
			/// The higher the better of course, but also the slower...
			/// </summary>
			public int				StepsCount				{ get { return m_StepsCount; } set { m_StepsCount = Math.Max( 1, value ); } }

			/// <summary>
			/// Gets or sets the shadow map quality
			/// </summary>
			public SHADOW_QUALITY	ShadowQuality
			{
				get { return m_ShadowQuality; }
				set
				{
					if ( value == m_ShadowQuality )
						return;

					m_ShadowQuality = value;

					InitializeShadowMap();

					// Notify
					if ( ShadowQualityChanged != null )
						ShadowQualityChanged( this, EventArgs.Empty );
				}
			}

			/// <summary>
			/// Gets or sets the size of the internal deep shadow map
			/// </summary>
			public int				ShadowMapSize
			{
				get { return m_ShadowMapSize; }
				set
				{
					value = Math.Max( 64, value );
					if ( value == m_ShadowMapSize )
						return;

					m_ShadowMapSize = value;

					InitializeShadowMap();
				}
			}

			/// <summary>
			/// Tells if we should smooth out the shadow map
			/// </summary>
			public bool						SmoothShadowMap
			{
				get { return m_bSmoothShadowMap; }
				set { m_bSmoothShadowMap = value; }
			}

			/// <summary>
			/// Gets or sets the size of the smoothing kernel
			/// </summary>
			public float					SmoothSize
			{
				get { return m_SmoothSize; }
				set { m_SmoothSize = value; }
			}

			/// <summary>
			/// Occurs whenever the ShadowQuality parameter changes
			/// </summary>
			public event EventHandler		ShadowQualityChanged;

			#endregion

			#region Appearance

			/// <summary>
			/// Gets or sets the cloud coverage
			/// </summary>
			public float					Coverage
			{
				get { return m_Coverage; }
				set { m_Coverage = value; }
			}

			/// <summary>
			/// Gets or sets the cloud density that influences the capacity of the cloud to absorb and scatter light
			/// </summary>
			public float					Density
			{
				get { return m_Density; }
				set
				{
					if ( Mathf.Approximately( value, m_Density ) )
						return;

					m_Density = value;
					UpdateCachedValues();
				}
			}

			/// <summary>
			/// Gets or sets the cloud density via what is called the "mean free path"
			/// The mean free path is the approximate distance light can travel through the cloud without hitting a particle.
			/// If the mean free path is short (a few meters) then the cloud will likely be very dark as it contains a lot of scattering particles.
			/// If the mean free path is long (up to a few hundred meters) then the cloud will be very bright as almost no light gets scattered.
			/// </summary>
			public float					MeanFreePath
			{
				get { return 1.0f / Math.Max( 1e-3f, 4.0f * Mathf.PI * m_Density ); }
				set
				{
					value = Math.Max( 0.1f, value );
					if ( Mathf.Approximately( value, MeanFreePath ) )
						return;

					Density = 1.0f / (4.0f * Mathf.PI * value);
				}
			}

			/// <summary>
			/// Gets or sets the internal color of the clouds (for funky clouds only)
			/// </summary>
			public Color					CloudColor
			{
				get { return m_CloudColor; }
				set { m_CloudColor = value; }
			}

			/// <summary>
			/// Gets or sets the trace limiter factor that allows to clamp the trace distance and avoid tracing too large steps
			/// </summary>
			public float					TraceLimiter
			{
				get { return m_TraceLimiter; }
				set { m_TraceLimiter = value; }
			}

			/// <summary>
			/// Gets or sets the distance (in kilometers) at which we start blending with the horizon
			/// </summary>
			public float					HorizonBlendStart
			{
				get { return m_HorizonBlendStart; }
				set { m_HorizonBlendStart = value; }
			}

			/// <summary>
			/// Gets or sets the distance (in kilometers) at which we fully blend with the horizon
			/// </summary>
			public float					HorizonBlendEnd
			{
				get { return m_HorizonBlendEnd; }
				set { m_HorizonBlendEnd = value; }
			}

			/// <summary>
			/// Gets or sets the blend value indicating if we should blend to empty cloud density (0) or full cloud density (1).
			/// A value of 0 will let the horizon appear in the distance, while a value of 1 will make the horizon completely filled with clouds
			/// </summary>
			public float					HorizonBlendValue
			{
				get { return m_HorizonBlendValue; }
				set { m_HorizonBlendValue = Mathf.Clamp01( value ); }
			}

			#endregion

			#region Wind Animation

			/// <summary>
			/// Gets or sets the force of the wind in cloud units per seconds
			/// </summary>
			public float					WindForce
			{
				get { return m_WindForce; }
				set { m_WindForce = value; }
			}

			/// <summary>
			/// Gets or sets the 2D wind direction
			/// </summary>
			public Vector2					WindDirection
			{
				get { return m_WindDirection; }
				set { m_WindDirection = value.normalized; }
			}

			/// <summary>
			/// Gets or sets the angle of the wind
			/// </summary>
			public float					WindDirectionAngle
			{
				get { return Mathf.Atan2( m_WindDirection.y, m_WindDirection.x ); }
				set { WindDirection = new Vector2( Mathf.Cos( value ), Mathf.Sin( value ) ); }
			}

			/// <summary>
			/// Gets or sets the speed at which clouds evolve
			/// </summary>
			public float					EvolutionSpeed
			{
				get { return m_EvolutionSpeed; }
				set { m_EvolutionSpeed = value; }
			}

			#endregion

			#region Noise

			/// <summary>
			/// Gets or sets the tiling factor of the noise texture
			/// </summary>
			public float					NoiseTiling
			{
				get { return m_NoiseTiling; }
				set { m_NoiseTiling = value; }
			}

			/// <summary>
			/// Gets or sets the frequency factor applied for each additional noise octave
			/// </summary>
			public float					FrequencyFactor
			{
				get { return m_FrequencyFactor; }
				set { m_FrequencyFactor = value; }
			}

			/// <summary>
			/// Gets or sets the amplitude factor applied for each additional noise octave
			/// </summary>
			public float					AmplitudeFactor
			{
				get { return m_AmplitudeFactor; }
				set { m_AmplitudeFactor = value; }
			}

			#endregion

			#region Advanced Lighting

			/// <summary>
			/// Gets or sets the cloud albedo.
			/// Cloud albedo (i.e. the ability of the cloud to scatter and reflect light) is defined as a ratio of the Extinction.
			/// A value of 0 will yield extremely dark clouds while a value of 1 will reflect all light and absorb nothing (in nature, it is usually considered to be almost 1, because clouds are mostly composed of small water droplets that mainly reflect light : almost no absorption occurs, hence the whiteness of clouds)
			/// </summary>
			public float					Albedo
			{
				get { return m_Albedo; }
				set
				{
					if ( Mathf.Approximately( value, m_Albedo ) )
						return;

					m_Albedo = Mathf.Clamp01( value );
					UpdateCachedValues();
				}
			}

			/// <summary>
			/// Gets or sets the factor applied to directional lighting
			/// </summary>
			public float					DirectionalFactor
			{
				get { return m_DirectionalFactor; }
				set { m_DirectionalFactor = value; }
			}

			/// <summary>
			/// Gets or sets the factor applied to isotropic (i.e. ambient) lighting
			/// </summary>
			public float					IsotropicFactor
			{
				get { return m_IsotropicFactor; }
				set { m_IsotropicFactor = value; }
			}

			/// <summary>
			/// Gets or sets the magic constant
			/// </summary>
			public float					IsotropicDensity
			{
				get { return m_IsotropicDensity; }
				set { m_IsotropicDensity = value; }
			}

			/// <summary>
			/// Gets or sets the factor applied to isotropic sky lighting
			/// This gives the amount of diffusion of ambient sky light into the cloud
			/// </summary>
			public float					IsotropicFactorSky
			{
				get { return m_IsotropicFactorSky; }
				set { m_IsotropicFactorSky = value; }
			}

			/// <summary>
			/// Gets or sets the factor applied to isotropic terrain lighting
			/// This gives the amount of diffusion of ambient terrain-reflected light into the cloud
			/// </summary>
			public float					IsotropicFactorTerrain
			{
				get { return m_IsotropicFactorTerrain; }
				set { m_IsotropicFactorTerrain = value; }
			}

			#region Phases Parameters

			/// <summary>
			/// Gets or sets the anisotropy factor for the "strong-forward" phase
			/// </summary>
			public float					PhaseAnisotropyStrongForward
			{
				get { return m_PhaseAnisotropyStrongForward; }
				set { m_PhaseAnisotropyStrongForward = Mathf.Clamp( value, -1.0f, +1.0f ); }
			}

			/// <summary>
			/// Gets or sets the weight of the "strong-forward" phase
			/// </summary>
			public float					PhaseWeightStrongForward
			{
				get { return m_PhaseWeightStrongForward; }
				set { m_PhaseWeightStrongForward = Mathf.Clamp01( value ); }
			}

			/// <summary>
			/// Gets or sets the anisotropy factor for the "forward" phase
			/// </summary>
			public float					PhaseAnisotropyForward
			{
				get { return m_PhaseAnisotropyForward; }
				set { m_PhaseAnisotropyForward = Mathf.Clamp( value, -1.0f, +1.0f ); }
			}

			/// <summary>
			/// Gets or sets the weight of the "forward" phase
			/// </summary>
			public float					PhaseWeightForward
			{
				get { return m_PhaseWeightForward; }
				set { m_PhaseWeightForward = Mathf.Clamp01( value ); }
			}

			/// <summary>
			/// Gets or sets the anisotropy factor for the "backward" phase
			/// </summary>
			public float					PhaseAnisotropyBackward
			{
				get { return m_PhaseAnisotropyBackward; }
				set { m_PhaseAnisotropyBackward = Mathf.Clamp( value, -1.0f, +1.0f ); }
			}

			/// <summary>
			/// Gets or sets the weight of the "backward" phase
			/// </summary>
			public float					PhaseWeightBackward
			{
				get { return m_PhaseWeightBackward; }
				set { m_PhaseWeightBackward = Mathf.Clamp01( value ); }
			}

			/// <summary>
			/// Gets or sets the anisotropy factor for the "sideway" phase
			/// </summary>
			public float					PhaseAnisotropySide
			{
				get { return m_PhaseAnisotropySide; }
				set { m_PhaseAnisotropySide = Mathf.Clamp( value, -1.0f, +1.0f ); }
			}

			/// <summary>
			/// Gets or sets the weight of the "sideway" phase
			/// </summary>
			public float					PhaseWeightSide
			{
				get { return m_PhaseWeightSide; }
				set { m_PhaseWeightSide = Mathf.Clamp01( value ); }
			}

			#endregion

			#endregion

			#endregion

			#region METHODS

			public	CloudLayer()
			{
				m_AltitudeKm = DEFAULT_ALTITUDE;
				m_ThicknessKm = DEFAULT_THICKNESS;
			}

			#region IMonoBehaviour Members

			public override void OnDestroy()
			{
				base.OnDestroy();

				DestroyShadowMaps();
			}

			public override void Awake()
			{
				base.Awake();

				InitializeShadowMap();
			}

			public override void OnEnable()
			{
				base.OnEnable();

				// Initialize shadow maps if they're missing
				if ( m_RTShadowMaps == null )
					InitializeShadowMap();

				// Update internal data
				UpdateCachedValues();
			}

			public override void Update()
			{
				// Accumulate position
				Vector2		Wind = m_WindForce * m_WindDirection;
				Vector2		CloudPositionMain = new Vector2( m_CloudPosition.x, m_CloudPosition.y );
				Vector2		CloudPositionOctave = new Vector2( m_CloudPosition.z, m_CloudPosition.w );
							CloudPositionMain += m_NoiseTiling * Wind * NuajTime.DeltaTime;
							CloudPositionOctave += m_EvolutionSpeed * m_NoiseTiling * Wind * NuajTime.DeltaTime;
				m_CloudPosition = new Vector4( CloudPositionMain.x, CloudPositionMain.y, CloudPositionOctave.x, CloudPositionOctave.y );
			}

			#endregion

			#region ICloudLayer Members

			public override void	Render( int _LayerIndex, RenderTexture _ShadowMap, RenderTexture _ShadowEnvMapSky, RenderTexture _ShadowEnvMapSun, bool _bRenderEnvironment )
			{
				if ( m_Owner.m_Owner == null )
					return;	// When using a prefab, the module's owner is invalid

				Vector2		AmplitudeFactor = new Vector2( m_AmplitudeFactor, 1.0f / (1.0f + m_AmplitudeFactor * (1.0f + m_AmplitudeFactor * (1.0f + m_AmplitudeFactor))) );
				Vector2		Thickness = new Vector2( m_ThicknessKm, 1.0f / m_ThicknessKm );

				float		Coverage = Mathf.Lerp( -1.0f, 0.25f, 0.5f * (1.0f + m_Coverage) );	// Rescale the coverage to match 2D layer behaviour
				Vector3		HorizonBlend = new Vector3( m_HorizonBlendStart, m_HorizonBlendEnd, m_HorizonBlendValue );

				// Downscale the ZBuffer
				RenderTexture	DownScaledZBuffer = Owner.Owner.DownScaleZBuffer( Owner.m_DownScaleFactor );

				//////////////////////////////////////////////////////////////////////////
				// Render the deep shadow map layers
				NuajMaterial	M = Owner.m_MaterialRenderCloudShadow;

				if ( CastShadow )
				{
					int	ShadowStepsCount = 1 + 4 * m_RTShadowMaps.Length;

					RenderTexture	TempShadowMap = null;
					if ( m_bSmoothShadowMap )
						TempShadowMap = Help.CreateTempRT( m_ShadowMapSize, m_ShadowMapSize, RenderTextureFormat.ARGBHalf, FilterMode.Bilinear, TextureWrapMode.Clamp );

					M.SetVector( "_BufferInvSize", new Vector2( 1.0f / m_ShadowMapSize, 1.0f / m_ShadowMapSize ) );

					M.SetFloat( "_CloudAltitudeKm", m_AltitudeKm );
					M.SetVector( "_CloudThicknessKm", Thickness );
					M.SetFloat( "_CloudLayerIndex", _LayerIndex );
					M.SetTexture( "_TexShadowMap", _ShadowMap );
					M.SetTexture( "_TexShadowEnvMapSky", _ShadowEnvMapSky );
					M.SetTexture( "_TexShadowEnvMapSun", _ShadowEnvMapSun );

					M.SetFloat( "_Coverage", Coverage );
					M.SetFloat( "_CloudTraceLimiter", m_TraceLimiter );
					M.SetVector( "_HorizonBlend", HorizonBlend );
					M.SetFloat( "_NoiseTiling", m_NoiseTiling );
					M.SetFloat( "_FrequencyFactor", m_FrequencyFactor );
					M.SetVector( "_AmplitudeFactor", AmplitudeFactor );
					M.SetVector( "_CloudPosition", m_CloudPosition );
					M.SetColor( "_CloudColor", m_CloudColor );

					M.SetFloat( "_CloudSigma_t", m_SigmaExtinction );
					M.SetFloat( "_ShadowStepsCount", ShadowStepsCount );

					for ( int DeepShadowMapLayerIndex=0; DeepShadowMapLayerIndex < m_RTShadowMaps.Length; DeepShadowMapLayerIndex++ )
					{
						if ( DeepShadowMapLayerIndex == 0 )
						{	// First layer only samples the global shadow map for initial shadowing
							M.Blit( null, m_RTShadowMaps[DeepShadowMapLayerIndex], 0 );
						}
						else
						{	// Subsequent layers read previous layer and start with an offset
							M.SetFloat( "_ShadowStepOffset", 4*DeepShadowMapLayerIndex );
							M.SetTexture( "_TexDeepShadowMapPreviousLayer", m_RTShadowMaps[DeepShadowMapLayerIndex-1] );
							M.Blit( null, m_RTShadowMaps[DeepShadowMapLayerIndex], 1 );
						}


						if ( m_bSmoothShadowMap )
						{	// Smooth out the shadow map
							M.SetVector( "_dUV", m_SmoothSize * new Vector4( 1.0f / m_ShadowMapSize, 0.0f, 0.0f, 0.0f ) );
							M.Blit( m_RTShadowMaps[DeepShadowMapLayerIndex], TempShadowMap, 2 );	// First horizontal pass

							M.SetVector( "_dUV", m_SmoothSize * new Vector4( 0.0f, 1.0f / m_ShadowMapSize, 0.0f, 0.0f ) );
							M.Blit( TempShadowMap, m_RTShadowMaps[DeepShadowMapLayerIndex], 2 );	// Second vertical pass
						}
					}

					if ( TempShadowMap != null )
						Help.ReleaseTemporary( TempShadowMap );

					// Render the environment deep shadow map
					if ( _bRenderEnvironment )
						M.Blit( null, m_RTShadowMapEnvSky, 3 );
				}
				else
				{	// Clear to white (i.e. no shadowing)
					for ( int DeepShadowMapLayerIndex=0; DeepShadowMapLayerIndex < m_RTShadowMaps.Length; DeepShadowMapLayerIndex++ )
						m_Owner.Owner.ClearTarget( m_RTShadowMaps[DeepShadowMapLayerIndex], Vector4.one );
				}

				//////////////////////////////////////////////////////////////////////////
				// Setup material parameters
				M = Owner.m_MaterialRenderCloud;

				M.SetFloat( "_CloudAltitudeKm", m_AltitudeKm );
				M.SetVector( "_CloudThicknessKm", Thickness );
				M.SetFloat( "_CloudLayerIndex", _LayerIndex );

				M.SetTexture( "_TexDownScaledZBuffer", DownScaledZBuffer );
				M.SetFloat( "_ZBufferDiscrepancyThreshold", m_Owner.Owner.ZBufferDiscrepancyThreshold );

				// Noise parameters
				M.SetFloat( "_Coverage", Coverage );
				M.SetFloat( "_CloudTraceLimiter", m_TraceLimiter );
				M.SetVector( "_HorizonBlend", HorizonBlend );
				M.SetFloat( "_NoiseTiling", m_NoiseTiling );
				M.SetFloat( "_FrequencyFactor", m_FrequencyFactor );
				M.SetVector( "_AmplitudeFactor", AmplitudeFactor );
				M.SetVector( "_CloudPosition", m_CloudPosition );
				M.SetColor( "_CloudColor", m_CloudColor );

				// Lighting parameters
				M.SetFloat( "_CloudSigma_t", m_SigmaExtinction );
				M.SetFloat( "_CloudSigma_s", m_SigmaScattering );
				M.SetFloat( "_Albedo", m_Albedo );
				M.SetFloat( "_PhaseAnisotropyStrongForward", m_PhaseAnisotropyStrongForward );
				M.SetFloat( "_PhaseWeightStrongForward", m_PhaseWeightStrongForward );
				M.SetFloat( "_PhaseAnisotropyForward", m_PhaseAnisotropyForward );
				M.SetFloat( "_PhaseWeightForward", m_PhaseWeightForward );
				M.SetFloat( "_PhaseAnisotropyBackward", m_PhaseAnisotropyBackward );
				M.SetFloat( "_PhaseWeightBackward", m_PhaseWeightBackward );
				M.SetFloat( "_PhaseAnisotropySide", m_PhaseAnisotropySide );
				M.SetFloat( "_PhaseWeightSide", m_PhaseWeightSide );
				M.SetFloat( "_DirectionalFactor", m_DirectionalFactor );
				M.SetFloat( "_IsotropicFactor", m_IsotropicFactor );
				M.SetFloat( "_IsotropicDensity", m_IsotropicDensity );

				M.SetVector( "_IsotropicScatteringFactors", new Vector2( m_IsotropicFactorSky, m_IsotropicFactorTerrain ) );

				// Rendering parameters
				M.SetFloat( "_StepsCount", m_StepsCount );
				M.SetFloat( "_ShadowLayersCount", 4 * m_RTShadowMaps.Length );
				for ( int DeepShadowMapLayerIndex=0; DeepShadowMapLayerIndex < m_RTShadowMaps.Length; DeepShadowMapLayerIndex++ )
					M.SetTexture( "_TexDeepShadowMap" + DeepShadowMapLayerIndex, m_RTShadowMaps[DeepShadowMapLayerIndex] );
				M.SetTexture( "_TexShadowEnvMapSky", _ShadowEnvMapSky );
				M.SetTexture( "_TexShadowEnvMapSun", _ShadowEnvMapSun );

				// Since we need sky support for Sun attenuation computation
				m_Owner.Owner.ModuleSky.SetupScatteringCoefficients( M, true );


				//////////////////////////////////////////////////////////////////////////
				// Main rendering
				NuajManager.UPSCALE_TECHNIQUE	UpScaleTechnique = m_Owner.m_Owner.UpScaleTechnique;
				if ( UpScaleTechnique != NuajManager.UPSCALE_TECHNIQUE.BILINEAR )
				{
					RenderTexture	RTTempScattering = Help.CreateTempRT( m_Owner.m_Width, m_Owner.m_Height, RenderTextureFormat.ARGBHalf, FilterMode.Bilinear, TextureWrapMode.Clamp );

					RTTempScattering.filterMode = FilterMode.Bilinear;

// This is now fixed thanks to my own management of temp textures ! But I leave the code here as a memento
// 					// STOOPID FIX (because I'm tired)
// 					if ( Application.isWebPlayer )
// 						RTTempScattering.filterMode = FilterMode.Trilinear;	// For some reason, bilinear behaves like point sampling in the web player ! õ0
// 					// STOOPID FIX

					// Render to the downscaled buffer
					M.SetVector( "_BufferInvSize", new Vector2( 1.0f / RTTempScattering.width, 1.0f / RTTempScattering.height ) );
					M.Blit( null, RTTempScattering, 4 );

 					// UpScale to the fullscale buffer
					M.SetFloat( "_ZBufferDiscrepancyThreshold", m_Owner.m_Owner.ZBufferDiscrepancyThreshold );
					M.SetFloat( "_ShowZBufferDiscrepancies", m_Owner.m_Owner.ShowZBufferDiscrepancies ? 1.0f : 0.0f );
 					M.SetVector( "_dUV", new Vector4( 1.0f / RTTempScattering.width, 1.0f / RTTempScattering.height, 0.0f, 0.0f ) );
					M.SetVector( "_InvdUV", new Vector4( RTTempScattering.width, RTTempScattering.height, 0.0f, 0.0f ) );
					M.SetFloat( "_UseSceneZ", UpScaleTechnique == NuajManager.UPSCALE_TECHNIQUE.SMART ? 0.0f : 1.0f );

					M.Blit( RTTempScattering, m_RTScattering, UpScaleTechnique == NuajManager.UPSCALE_TECHNIQUE.ACCURATE ? 7 : 8 );

					// Discard temp scattering
					Help.ReleaseTemporary( RTTempScattering );
				}
				else
				{	// Direct render to downsampled buffer
					M.SetVector( "_BufferInvSize", new Vector2( 1.0f / m_RTScattering.width, 1.0f / m_RTScattering.height ) );
					M.SetFloat( "_UseSceneZ", 1.0f );
					M.Blit( null, m_RTScattering, 4 );
				}

				//////////////////////////////////////////////////////////////////////////
				// Render the cloud's shadow into the global shadow map
				if ( m_bCastShadow )
				{
					M.SetVector( "_BufferInvSize", new Vector2( 1.0f / _ShadowMap.width, 1.0f / _ShadowMap.height ) );
					M.SetTexture( "_TexShadowMap", null as RenderTexture );	// Don't use the shadow map as a texture since we're rendering into it !

					M.Blit( null, _ShadowMap, _LayerIndex );	// The index of the layer guides the shader choice here.
				}

				//////////////////////////////////////////////////////////////////////////
				// Render the env map
				if ( _bRenderEnvironment )
				{
					M.SetFloat( "_StepsCount", ENVIRONMENT_CLOUD_STEPS_COUNT );

					M.SetTexture( "_TexDeepShadowMap0", m_RTShadowMapEnvSky );
					M.Blit( null, m_RTEnvMapSky, 5 );

					M.SetTexture( "_TexDeepShadowMap0", _ShadowEnvMapSun );
					M.Blit( null, m_RTEnvMapSun, 6 );
				}
			}

			#endregion

			/// <summary>
			/// Resets the layer to its default values
			/// </summary>
			public override void		Reset()
			{
				base.Reset();

				Altitude = DEFAULT_ALTITUDE;
				Thickness = DEFAULT_THICKNESS;
				Coverage = DEFAULT_COVERAGE;
				Density = DEFAULT_DENSITY;
				CloudColor = DEFAULT_COLOR;
				TraceLimiter = DEFAULT_TRACE_LIMITER;
				HorizonBlendStart = DEFAULT_HORIZON_BLEND_START;
				HorizonBlendEnd = DEFAULT_HORIZON_BLEND_END;
				HorizonBlendValue = DEFAULT_HORIZON_BLEND_VALUE;
				NoiseTiling = DEFAULT_NOISE_TILING;
				FrequencyFactor = DEFAULT_FREQ_FACTOR;
				AmplitudeFactor = DEFAULT_AMPL_FACTOR;
				WindForce = DEFAULT_WIND_FORCE;
				WindDirection = DEFAULT_WIND_DIRECTION;
				EvolutionSpeed = DEFAULT_EVOLUTION_SPEED;
				Albedo = DEFAULT_ALBEDO;
				DirectionalFactor = DEFAULT_DIR_FACTOR;
				IsotropicFactor = DEFAULT_ISO_FACTOR;
				IsotropicDensity = DEFAULT_ISO_DENSITY;
				IsotropicFactorSky = DEFAULT_ISO_FACTOR_SKY;
				IsotropicFactorTerrain = DEFAULT_ISO_FACTOR_TERRAIN;
				PhaseWeightStrongForward = DEFAULT_PHASE_WEIGHT_SF;
				PhaseWeightForward = DEFAULT_PHASE_WEIGHT_F;
				PhaseWeightBackward = DEFAULT_PHASE_WEIGHT_B;
				PhaseWeightSide = DEFAULT_PHASE_WEIGHT_S;
				PhaseAnisotropyStrongForward = DEFAULT_PHASE_ANISOTROPY_SF;
				PhaseAnisotropyForward = DEFAULT_PHASE_ANISOTROPY_F;
				PhaseAnisotropyBackward = DEFAULT_PHASE_ANISOTROPY_B;
				PhaseAnisotropySide = DEFAULT_PHASE_ANISOTROPY_S;
				StepsCount = DEFAULT_STEPS_COUNT;
				ShadowMapSize = DEFAULT_SHADOW_MAP_SIZE;
				ShadowQuality = DEFAULT_SHADOW_MAP_QUALITY;
				SmoothShadowMap = DEFAULT_SMOOTH_SHADOW_MAP;
				SmoothSize = DEFAULT_SMOOTH_SIZE;
			}

			protected void	InitializeShadowMap()
			{
				DestroyShadowMaps();

				int	ShadowLayersCount = 0;
				switch ( m_ShadowQuality )
				{
					case SHADOW_QUALITY.DEEP_SHADOW_MAP_ONE_LAYER:
						ShadowLayersCount = 1;
						break;
					case SHADOW_QUALITY.DEEP_SHADOW_MAP_TWO_LAYERS:
						ShadowLayersCount = 2;
						break;
					case SHADOW_QUALITY.DEEP_SHADOW_MAP_THREE_LAYERS:
						ShadowLayersCount = 3;
						break;
				}

				Help.LogDebug( "Initializing Volume Cloud Deep Shadow Map with " + ShadowLayersCount + " layers..." );

				if ( ShadowLayersCount == 0 )
					return;	// No shadow map...

				// Create the new shadow map layers
				m_RTShadowMaps = new RenderTexture[ShadowLayersCount];
				for ( int LayerIndex=0; LayerIndex < ShadowLayersCount; LayerIndex++ )
					m_RTShadowMaps[LayerIndex] = Help.CreateRT( "VolumeDeepShadowMap Layer #" + LayerIndex, m_ShadowMapSize, m_ShadowMapSize, RenderTextureFormat.ARGBHalf, FilterMode.Bilinear, TextureWrapMode.Clamp );
				m_RTShadowMapEnvSky = Help.CreateRT( "VolumeDeepShadowMap Env Sky", 2 << NuajManager.ENVIRONMENT_TEXTURE_SIZE_POT, 1 << NuajManager.ENVIRONMENT_TEXTURE_SIZE_POT, RenderTextureFormat.ARGBHalf, FilterMode.Bilinear, TextureWrapMode.Clamp );
			}

			protected void	DestroyShadowMaps()
			{
				if ( m_RTShadowMaps == null )
					return;	// Already cleared...

				// Destroy existing shadow maps
				Help.SafeDestroy( ref m_RTShadowMapEnvSky );
				for ( int LayerIndex=0; LayerIndex < m_RTShadowMaps.Length; LayerIndex++ )
					Help.SafeDestroy( ref m_RTShadowMaps[LayerIndex] );
				m_RTShadowMaps = null;
			}

			internal override void	CreateRenderTargets( int _Width, int _Height )
			{
				if ( m_Owner.m_Owner == null )
					return;	// When using a prefab, the module's owner is invalid

				int		Width = _Width;
				int		Height = _Height;
				if ( m_Owner.m_Owner.UpScaleTechnique != NuajManager.UPSCALE_TECHNIQUE.BILINEAR )
				{	// Use fullscale size !
					Width = m_Owner.m_ScreenWidth;
					Height = m_Owner.m_ScreenHeight;
				}

				m_RTScattering = Help.CreateRT( "VolumeCloudTarget", Width, Height, RenderTextureFormat.ARGBHalf, FilterMode.Bilinear, TextureWrapMode.Clamp );
				CreateEnvMaps( "VolumeCloudEnvMap" );
			}

			internal override void	DestroyRenderTargets()
			{
				Help.SafeDestroy( ref m_RTScattering );
				Help.SafeDestroy( ref m_RTEnvMapSky );
				Help.SafeDestroy( ref m_RTEnvMapSun );
			}

			internal override void UpScaleTechniqueChanged( NuajManager.UPSCALE_TECHNIQUE _Technique )
			{
				base.UpScaleTechniqueChanged( _Technique );

				// Re-allocate render targets
				DestroyRenderTargets();
				CreateRenderTargets( m_Owner.m_Width, m_Owner.m_Height );
			}

			protected override void	UpdateCachedValues()
			{
				base.UpdateCachedValues();

				m_SigmaExtinction = 4.0f * Mathf.PI * m_Density;
				m_SigmaScattering = m_Albedo * m_SigmaExtinction;
			}

			#endregion
		}

		#endregion

		#region FIELDS

		/////////////////////////////////////////////////////////
		// General serializable parameters
		[SerializeField] protected float				m_DownScaleFactor = 0.25f;
		[SerializeField] protected List<CloudLayer>		m_CloudLayers = new List<CloudLayer>();
		[SerializeField] protected int					m_SelectedLayerIndex = -1;


		/////////////////////////////////////////////////////////
		// Materials
		protected NuajMaterial			m_MaterialRenderCloud = null;
		protected NuajMaterial			m_MaterialRenderCloudShadow = null;

		#endregion

		#region PROPERTIES

		/// <summary>
		/// Gets the owner NuajManager instance
		/// </summary>
		public override NuajManager Owner
		{
			get { return base.Owner; }
			internal set
			{
				base.Owner = value;

				// Also reconnect the layers' owner
				foreach ( CloudLayer L in m_CloudLayers )
					L.Owner = this;
			}
		}

		/// <summary>
		/// Gets or sets the downscale factor the module will render with
		/// </summary>
		public float		DownScaleFactor
		{
			get { return m_DownScaleFactor; }
			set
			{
				value = Math.Max( 0.05f, Math.Min( 1.0f, value ) );
				if ( value == m_DownScaleFactor )
					return;

				m_DownScaleFactor = value;
				
				// Update render targets
				UpdateRenderTargets();
			}
		}

		/// <summary>
		/// Gets the list of existing clouds layers
		/// </summary>
		public override ICloudLayer[]	CloudLayers		{ get { return m_CloudLayers.ToArray(); } }

		/// <summary>
		/// Gets or sets the cloud layer currently selected by the user (a GUI thingy really)
		/// </summary>
		public CloudLayer	SelectedLayer
		{
			get { return m_SelectedLayerIndex >= 0 && m_SelectedLayerIndex < m_CloudLayers.Count ? m_CloudLayers[m_SelectedLayerIndex] : null; }
			set
			{
				if ( value == null )
					m_SelectedLayerIndex = -1;
				else
					m_SelectedLayerIndex = m_CloudLayers.IndexOf( value );
			}
		}

		/// <summary>
		/// Gets the amount of existing cloud layers
		/// </summary>
		public int			CloudLayersCount			{ get { return m_CloudLayers.Count; } }

		#endregion

		#region METHODS

		internal	ModuleCloudVolume( string _Name ) : base( _Name )
		{
		}

		#region IMonoBehaviour Members

		public override void OnDestroy()
		{
			Help.LogDebug( "ModuleCloudVolume.OnDestroy() !" );

			// Forward to layers
			foreach ( CloudLayer L in m_CloudLayers )
				L.OnDestroy();
		}

		public override void Awake()
		{
			Help.LogDebug( "ModuleCloudVolume.Awake() !" );

			// Forward to layers
			foreach ( CloudLayer L in m_CloudLayers )
			{
				L.Owner = this;
				L.Awake();
			}
		}

		public override void Start()
		{
			Help.LogDebug( "ModuleCloudVolume.Start() !" );

			// Forward to layers
			foreach ( CloudLayer L in m_CloudLayers )
				L.Start();
		}

		public override void OnEnable()
		{
			Help.LogDebug( "ModuleCloudVolume.OnEnable() !" );
			try
			{
				m_MaterialRenderCloud = Help.CreateMaterial( "Clouds/CloudVolume" );
				m_MaterialRenderCloudShadow = Help.CreateMaterial( "Clouds/CloudVolumeShadow" );

				ExitErrorState();
			}
			catch ( Exception _e )
			{
				EnterErrorState( "An error occurred while creating the materials for the module.\r\n" + _e.Message );
			}

			// Forward to layers
			foreach ( CloudLayer L in m_CloudLayers )
				L.OnEnable();
		}

		public override void OnDisable()
		{
			Help.LogDebug( "ModuleCloudVolume.OnDisable() !" );

			// Forward to layers
			foreach ( CloudLayer L in m_CloudLayers )
				L.OnDisable();

			Help.SafeDestroyNuaj( ref m_MaterialRenderCloud );
			Help.SafeDestroyNuaj( ref m_MaterialRenderCloudShadow );
		}

		public override void Update()
		{
			// Forward to layers
			foreach ( CloudLayer L in m_CloudLayers )
				L.Update();
		}

		#endregion

		/// <summary>
		/// Adds a new cloud layer at specified altitude and of specified thickness
		/// </summary>
		/// <param name="_Altitude">The altitude (in kilometers) of the cloud layer</param>
		/// <param name="_Thickness">The thickness (in kilometers) of the cloud layer</param>
		/// <returns></returns>
		public CloudLayer	AddLayer( float _Altitude, float _Thickness )
		{
			CloudLayer	Result = new CloudLayer();
			Result.Owner = this;
			Result.CreateRenderTargets( m_Width, m_Height );
			Result.Altitude = _Altitude;
			Result.Thickness = _Thickness;

			// Simulate Unity steps
			Result.Awake();
			Result.Start();
			Result.OnEnable();

			m_CloudLayers.Add( Result );

			// Update selection
			if ( SelectedLayer == null )
				SelectedLayer = Result;

			NotifyLayersChanged();

			return Result;
		}

		/// <summary>
		/// Removes an existing layer
		/// </summary>
		/// <param name="_Layer"></param>
		public void			RemoveLayer( CloudLayer _Layer )
		{
			if ( !m_CloudLayers.Contains( _Layer ) )
				return;

			// Backup selection
			CloudLayer	PreviousSelection = SelectedLayer;

			// Simulate Unity steps
			_Layer.OnDisable();
			_Layer.OnDestroy();

			m_CloudLayers.Remove( _Layer );

			// Restore selection
			SelectedLayer = PreviousSelection;
			if ( SelectedLayer == null && m_CloudLayers.Count > 0 )
				SelectedLayer = m_CloudLayers[0];	// Select first layer otherwise...

			NotifyLayersChanged();
		}

		#region Render Targets Size Update

		protected override void	InternalCreateRenderTargets()
		{
			// Compute downscaled with & height
			m_Width = (int) Math.Floor( m_DownScaleFactor * m_ScreenWidth );
			m_Width = Math.Max( 32, m_Width );

			m_Height = (int) Math.Floor( m_DownScaleFactor * m_ScreenHeight );
			m_Height = Math.Max( 32, m_Height );

			// Build targets
			foreach ( CloudLayer L in m_CloudLayers )
				L.CreateRenderTargets( m_Width, m_Height );
		}

		protected override void	InternalDestroyRenderTargets()
		{
			foreach ( CloudLayer L in m_CloudLayers )
				L.DestroyRenderTargets();
		}

		#endregion

		#endregion
	}
}