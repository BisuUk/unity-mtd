using System;
using System.Collections.Generic;
using UnityEngine;

namespace Nuaj
{
	/// <summary>
	/// This module is responsible for the display of layered clouds
	/// </summary>
	[Serializable]
	public class ModuleCloudLayer : ModuleCloudLayerBase
	{
		#region CONSTANTS

		protected const int		PHASE_TEXTURE_SIZE = 256;
		protected const float	PHASE_START_ANGLE = 5.0f * Mathf.PI / 180.0f;	// Skim the first 5° of the phase function as we compute transmitted 0-scattering events ourselves
		protected const float	PHASE_END_ANGLE = Mathf.PI;

		#endregion

		#region NESTED TYPES

		/// <summary>
		/// A single layer of 2D clouds
		/// </summary>
		[Serializable]
		public class	CloudLayer : CloudLayerBase
		{
			#region CONSTANTS

			// DEFAULT VALUES
			/// <summary>
			/// Default cloud altitude on construction
			/// </summary>
			public const float		DEFAULT_ALTITUDE = 8.0f;
			/// <summary>
			/// Default cloud thickness on construction
			/// </summary>
			public const float		DEFAULT_THICKNESS = 0.1f;
			protected const float	DEFAULT_COVERAGE = 0.0f;
			protected const float	DEFAULT_DENSITY = 0.002f;
			protected const float	DEFAULT_SMOOTHNESS = 3.0f;
			protected const float	DEFAULT_NORMAL_AMPLITUDE = 0.3f;
			protected static readonly Color	DEFAULT_COLOR = Color.white;
			protected const float	DEFAULT_NOISE_TILING = 0.006f;
			protected const float	DEFAULT_FREQ_FACTOR = 1.337f;
			protected const float	DEFAULT_FREQ_ANISOTROPY = 1.0f;
			protected const float	DEFAULT_AMPL_FACTOR = 0.5f;
			protected const int		DEFAULT_OCTAVES_COUNT = 2;
			protected const float	DEFAULT_WIND_FORCE = 0.0f;
			protected static readonly Vector2	DEFAULT_WIND_DIRECTION = Vector2.right;
			protected const float	DEFAULT_EVOLUTION_SPEED = 8.0f;
			protected const float	DEFAULT_FACTOR_SC0 = 2.0f;
			protected const float	DEFAULT_FACTOR_SC1 = 30.0f;
			protected const float	DEFAULT_FACTOR_SC2 = 800.0f;
			protected const float	DEFAULT_FACTOR_SC3p = 0.5f;
			protected const float	DEFAULT_FACTOR_SKY = 0.022f;
			protected const float	DEFAULT_FACTOR_TERRAIN = 0.015f;

			#endregion

			#region FIELDS

 			protected ModuleCloudLayer				m_Owner = null;

			// Appearance
			[SerializeField] protected float		m_Coverage = DEFAULT_COVERAGE;
			[SerializeField] protected float		m_Density = DEFAULT_DENSITY;
			[SerializeField] protected float		m_Smoothness = DEFAULT_SMOOTHNESS;
			[SerializeField] protected float		m_NormalAmplitude = DEFAULT_NORMAL_AMPLITUDE;
			[SerializeField] protected Color		m_CloudColor = DEFAULT_COLOR;

			// Noise
			[SerializeField] protected float		m_NoiseTiling = DEFAULT_NOISE_TILING;
			[SerializeField] protected float		m_FrequencyFactor = DEFAULT_FREQ_FACTOR;
			[SerializeField] protected float		m_FrequencyFactorAnisotropy = DEFAULT_FREQ_ANISOTROPY;
			[SerializeField] protected float		m_AmplitudeFactor = DEFAULT_AMPL_FACTOR;
			[SerializeField] protected int			m_NoiseOctavesCount = DEFAULT_OCTAVES_COUNT;

			// Animation
			[SerializeField] protected float		m_WindForce = DEFAULT_WIND_FORCE;
			[SerializeField] protected Vector2		m_WindDirection = DEFAULT_WIND_DIRECTION;
			[SerializeField] protected float		m_EvolutionSpeed = DEFAULT_EVOLUTION_SPEED;

			// Lighting
			[SerializeField] protected float		m_FactorZeroScattering = DEFAULT_FACTOR_SC0;
			[SerializeField] protected float		m_FactorSingleScattering = DEFAULT_FACTOR_SC1;
			[SerializeField] protected float		m_FactorDoubleScattering = DEFAULT_FACTOR_SC2;
			[SerializeField] protected float		m_FactorMultipleScattering = DEFAULT_FACTOR_SC3p;
			[SerializeField] protected float		m_FactorSkyColor = DEFAULT_FACTOR_SKY;
			[SerializeField] protected float		m_FactorTerrainColor = DEFAULT_FACTOR_TERRAIN;

			[SerializeField] protected NuajTexture2D	m_TextureNoise0 = new NuajTexture2D();
			[SerializeField] protected NuajTexture2D	m_TextureNoise1 = new NuajTexture2D();
			[SerializeField] protected NuajTexture2D	m_TextureNoise2 = new NuajTexture2D();
			[SerializeField] protected NuajTexture2D	m_TextureNoise3 = new NuajTexture2D();


			// Internal data
			protected Vector4					m_CloudPosition = Vector4.zero;	// Our very own position accumulators

			protected float						m_SigmaExtinction = 0.0f;

			#endregion

			#region PROPERTIES

			internal ModuleCloudLayer		Owner
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
			/// Tells this cloud layer is NOT a volumetric layer
			/// </summary>
			public override bool IsVolumetric		{ get { return false; } }

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
			/// Gets or sets the smoothness factor
			/// </summary>
			public float					Smoothness
			{
				get { return m_Smoothness; }
				set { m_Smoothness = value; }
			}

			/// <summary>
			/// Gets or sets the amplitude of the normal vector
			/// Large normal amplitudes give more bumpyness to the cloud but can look somewhat too much like a watery surface if excessive.
			/// </summary>
			public float					NormalAmplitude
			{
				get { return m_NormalAmplitude; }
				set { m_NormalAmplitude = value; }
			}

			/// <summary>
			/// Gets or sets the internal color of the clouds (for funky clouds only)
			/// </summary>
			public Color					CloudColor
			{
				get { return m_CloudColor; }
				set { m_CloudColor = value; }
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
			/// Gets or sets the amount of octaves to use for the noise
			/// </summary>
			public int						NoiseOctavesCount
			{
				get { return m_NoiseOctavesCount; }
				set { m_NoiseOctavesCount = Mathf.Clamp( value, 1, 4 ); }
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

			/// <summary>
			/// Gets or sets the frequency anisotropy in one of the 2 cloud directions
			/// This has the effect of stretching clouds in one direction
			/// </summary>
			public float					FrequencyFactorAnisotropy
			{
				get { return m_FrequencyFactorAnisotropy; }
				set { m_FrequencyFactorAnisotropy = value; }
			}

			/// <summary>
			/// Gets or sets the noise texture used for the first octave
			/// </summary>
			public Texture2D				NoiseTexture0
			{
				get { return m_TextureNoise0.Texture; }
				set { m_TextureNoise0.Texture = value; }
			}

			/// <summary>
			/// Gets or sets the noise texture used for the second octave
			/// </summary>
			public Texture2D				NoiseTexture1
			{
				get { return m_TextureNoise1.Texture; }
				set { m_TextureNoise1.Texture = value; }
			}

			/// <summary>
			/// Gets or sets the noise texture used for the third octave
			/// </summary>
			public Texture2D				NoiseTexture2
			{
				get { return m_TextureNoise2.Texture; }
				set { m_TextureNoise2.Texture = value; }
			}

			/// <summary>
			/// Gets or sets the noise texture used for the fourth octave
			/// </summary>
			public Texture2D				NoiseTexture3
			{
				get { return m_TextureNoise3.Texture; }
				set { m_TextureNoise3.Texture = value; }
			}

			#endregion

			#region Advanced Scattering Factors

			/// <summary>
			/// Gets or sets the factor to apply to direct Sun light traversing the cloud
			/// </summary>
			public float					FactorZeroScattering
			{
				get { return m_FactorZeroScattering; }
				set { m_FactorZeroScattering = value; }
			}

			/// <summary>
			/// Gets or sets the factor to apply to Sun light scattered only once
			/// </summary>
			public float					FactorSingleScattering
			{
				get { return m_FactorSingleScattering; }
				set { m_FactorSingleScattering = value; }
			}

			/// <summary>
			/// Gets or sets the factor to apply to Sun light scattered twice
			/// </summary>
			public float					FactorDoubleScattering
			{
				get { return m_FactorDoubleScattering; }
				set { m_FactorDoubleScattering = value; }
			}

			/// <summary>
			/// Gets or sets the factor to apply to Sun light scattered more than twice
			/// </summary>
			public float					FactorMultipleScattering
			{
				get { return m_FactorMultipleScattering; }
				set { m_FactorMultipleScattering = value; }
			}

			/// <summary>
			/// Gets or sets the factor to apply to ambient Sky light passing through the cloud
			/// </summary>
			public float					FactorSkyColor
			{
				get { return m_FactorSkyColor; }
				set { m_FactorSkyColor = value; }
			}

			/// <summary>
			/// Gets or sets the factor to apply to light reflected on the terrain
			/// </summary>
			public float					FactorTerrainColor
			{
				get { return m_FactorTerrainColor; }
				set { m_FactorTerrainColor = value; }
			}

			#endregion

			#endregion

			#region METHODS

			public	CloudLayer() : base()
			{
				m_AltitudeKm = DEFAULT_ALTITUDE;
				m_ThicknessKm = DEFAULT_THICKNESS;
			}

			#region IMonoBehaviour Members

			public override void Awake()
			{
				base.Awake();

				// Load default noise textures if none are set
				if ( NoiseTexture0 == null )
					NoiseTexture0 = Help.LoadTextureResource( "CloudLayers/Standard/NoiseNormalHeight0" );
				if ( NoiseTexture1 == null )
					NoiseTexture1 = Help.LoadTextureResource( "CloudLayers/Standard/NoiseNormalHeight1" );
				if ( NoiseTexture2 == null )
					NoiseTexture2 = Help.LoadTextureResource( "CloudLayers/Standard/NoiseNormalHeight2" );
				if ( NoiseTexture3 == null )
					NoiseTexture3 = Help.LoadTextureResource( "CloudLayers/Standard/NoiseNormalHeight3" );
			}

			public override void OnEnable()
			{
				base.OnEnable();

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
				//////////////////////////////////////////////////////////////////////////
				// Setup material parameters
				NuajMaterial	M = Owner.m_Material;

				M.SetFloat( "_CloudAltitudeKm", m_AltitudeKm );
				M.SetVector( "_CloudThicknessKm", new Vector2( m_ThicknessKm, 1.0f / m_ThicknessKm ) );
				M.SetFloat( "_CloudLayerIndex", _LayerIndex );
				M.SetTexture( "_TexShadowMap", _ShadowMap );
				M.SetTexture( "_TexShadowEnvMapSky", _ShadowEnvMapSky );
				M.SetTexture( "_TexShadowEnvMapSun", _ShadowEnvMapSun );

				// Noise parameters
				M.SetFloat( "_Coverage", m_Coverage );
				M.SetFloat( "_NoiseTiling", m_NoiseTiling );
				M.SetFloat( "_NoiseOctavesCount", m_NoiseOctavesCount );
				M.SetColor( "_CloudColor", m_CloudColor );

				M.SetVector( "_CloudPosition", m_CloudPosition );

				M.SetVector( "_FrequencyFactor", new Vector2( m_FrequencyFactor, m_FrequencyFactor * m_FrequencyFactorAnisotropy )  );
				M.SetVector( "_AmplitudeFactor", new Vector4( m_AmplitudeFactor, 1.0f / (1.0f + m_AmplitudeFactor), 1.0f / (1.0f + m_AmplitudeFactor * (1.0f + m_AmplitudeFactor)), 1.0f / (1.0f + m_AmplitudeFactor * (1.0f + m_AmplitudeFactor * (1.0f + m_AmplitudeFactor))) ) );
				M.SetFloat( "_Smoothness", m_Smoothness );
				M.SetFloat( "_NormalAmplitude", m_NormalAmplitude );

				M.SetFloat( "_ScatteringCoeff", m_SigmaExtinction );
				M.SetVector( "_ScatteringFactors", new Vector4( m_FactorZeroScattering, m_FactorSingleScattering, m_FactorDoubleScattering, m_FactorMultipleScattering ) );
				M.SetFloat( "_ScatteringSkyFactor", m_FactorSkyColor );
				M.SetFloat( "_ScatteringTerrainFactor", m_FactorTerrainColor );

				if ( m_TextureNoise0 != null )
					M.SetTexture( "_TexNoise0", m_TextureNoise0, true );
				if ( m_TextureNoise1 != null )
					M.SetTexture( "_TexNoise1", m_TextureNoise1, true );
				if ( m_TextureNoise2 != null )
					M.SetTexture( "_TexNoise2", m_TextureNoise2, true );
				if ( m_TextureNoise3 != null )
					M.SetTexture( "_TexNoise3", m_TextureNoise3, true );

				M.SetTexture( "_TexPhaseMie", Owner.m_TexturePhase, true );

				// Since we need sky support for Sun attenuation computation
				m_Owner.Owner.ModuleSky.SetupScatteringCoefficients( M, true );

				//////////////////////////////////////////////////////////////////////////
				// Render the cloud
				M.SetVector( "_BufferInvSize", new Vector2( 1.0f / m_RTScattering.width, 1.0f / m_RTScattering.height ) );

				M.Blit( null, m_RTScattering, 4 );

				//////////////////////////////////////////////////////////////////////////
				// Render the env map
				if ( _bRenderEnvironment )
				{
					M.Blit( null, m_RTEnvMapSky, 5 );
					M.Blit( null, m_RTEnvMapSun, 6 );
				}

				//////////////////////////////////////////////////////////////////////////
				// Render the cloud's shadow into the global shadow map
				if ( m_bCastShadow )
				{
					M.SetVector( "_BufferInvSize", new Vector2( 1.0f / _ShadowMap.width, 1.0f / _ShadowMap.height ) );
					M.SetTexture( "_TexShadowMap", null as RenderTexture );	// Don't use the shadow map as a texture since we're rendering into it !

					M.Blit( null, _ShadowMap, _LayerIndex );	// The index of the layer guides the shader choice here.
				}
			}

			#endregion

			public override void Reset()
			{
				base.Reset();

				Altitude = DEFAULT_ALTITUDE;
				Thickness = DEFAULT_THICKNESS;
				Coverage = DEFAULT_COVERAGE;
				Density = DEFAULT_DENSITY;
				Smoothness = DEFAULT_SMOOTHNESS;
				NormalAmplitude = DEFAULT_NORMAL_AMPLITUDE;
				CloudColor = DEFAULT_COLOR;
				NoiseTiling = DEFAULT_NOISE_TILING;
				FrequencyFactor = DEFAULT_FREQ_FACTOR;
				FrequencyFactorAnisotropy = DEFAULT_FREQ_ANISOTROPY;
				AmplitudeFactor = DEFAULT_AMPL_FACTOR;
				NoiseOctavesCount = DEFAULT_OCTAVES_COUNT;
				WindForce = DEFAULT_WIND_FORCE;
				WindDirection = DEFAULT_WIND_DIRECTION;
				EvolutionSpeed = DEFAULT_EVOLUTION_SPEED;
				FactorZeroScattering = DEFAULT_FACTOR_SC0;
				FactorSingleScattering = DEFAULT_FACTOR_SC1;
				FactorDoubleScattering = DEFAULT_FACTOR_SC2;
				FactorMultipleScattering = DEFAULT_FACTOR_SC3p;
				FactorSkyColor = DEFAULT_FACTOR_SKY;
				FactorTerrainColor = DEFAULT_FACTOR_TERRAIN;
			}

			internal override void	CreateRenderTargets( int _Width, int _Height )
			{
				m_RTScattering = Help.CreateRT( "LayerCloudTarget", _Width, _Height, RenderTextureFormat.ARGBHalf, FilterMode.Bilinear, TextureWrapMode.Clamp );
				CreateEnvMaps( "CloudLayerEnvMap" );
			}

			internal override void	DestroyRenderTargets()
			{
				Help.SafeDestroy( ref m_RTScattering );
				Help.SafeDestroy( ref m_RTEnvMapSky );
				Help.SafeDestroy( ref m_RTEnvMapSun );
			}

			protected override void	UpdateCachedValues()
			{
				base.UpdateCachedValues();

				m_SigmaExtinction = 4.0f * Mathf.PI * m_Density;
			}

			#endregion
		}

		#endregion

		#region FIELDS

		/////////////////////////////////////////////////////////
		// General serializable parameters
		[SerializeField] protected List<CloudLayer>		m_CloudLayers = new List<CloudLayer>();
		[SerializeField] protected int					m_SelectedLayerIndex = -1;


		/////////////////////////////////////////////////////////
		// Materials
		protected NuajMaterial			m_Material = null;

		/////////////////////////////////////////////////////////
		// Textures & Targets
		protected NuajTexture2D			m_TexturePhase = null;

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

		internal	ModuleCloudLayer( string _Name ) : base( _Name )
		{
		}

		#region IMonoBehaviour Members

		public override void OnDestroy()
		{
			Help.LogDebug( "ModuleCloudLayer.OnDestroy() !" );

			// Forward to layers
			foreach ( CloudLayer L in m_CloudLayers )
				L.OnDestroy();

			Help.SafeDestroyNuaj( ref m_TexturePhase );
		}

		public override void Awake()
		{
			Help.LogDebug( "ModuleCloudLayer.Awake() !" );

			// Forward to layers
			foreach ( CloudLayer L in m_CloudLayers )
			{
				L.Owner = this;
				L.Awake();
			}
		}

		public override void Start()
		{
			Help.LogDebug( "ModuleCloudLayer.Start() !" );

			// Forward to layers
			foreach ( CloudLayer L in m_CloudLayers )
			{
				L.Owner = this;
				L.Start();
			}
		}

		public override void OnEnable()
		{
			Help.LogDebug( "ModuleCloudLayer.OnEnable() !" );
			try
			{
				m_Material = Help.CreateMaterial( "Clouds/CloudLayer" );

				ExitErrorState();
			}
			catch ( Exception _e )
			{
				EnterErrorState( "An error occurred while creating the materials for the module.\r\n" + _e.Message );
			}

			// Forward to layers
			foreach ( CloudLayer L in m_CloudLayers )
			{
				L.Owner = this;	// As Awake() or Start() are not always called...
				L.OnEnable();
			}
		}

		public override void OnDisable()
		{
			Help.LogDebug( "ModuleCloudLayer.OnDisable() !" );

			// Forward to layers
			foreach ( CloudLayer L in m_CloudLayers )
				L.OnDisable();

			Help.SafeDestroyNuaj( ref m_Material );
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
			m_Width = m_ScreenWidth;
			m_Height = m_ScreenHeight;

			// Build targets
			foreach ( CloudLayer L in m_CloudLayers )
				L.CreateRenderTargets( m_Width, m_Height );

			// Build phase function
			BuildPhaseFunction( Nuaj.CloudPhaseFunction.MIE_PHASE_FUNCTION );
		}

		protected override void	InternalDestroyRenderTargets()
		{
			Help.SafeDestroyNuaj( ref m_TexturePhase );

			foreach ( CloudLayer L in m_CloudLayers )
				L.DestroyRenderTargets();
		}

		#endregion

		#region Phase Function

		/// <summary>
		/// Builds the table containing the Mie phase function
		/// </summary>
		protected void	BuildPhaseFunction( double[] _PhaseFunction )
		{
			// Compute MIN/MAX indices of the phase function
			int		MinIndex = Mathf.FloorToInt( _PhaseFunction.Length * PHASE_START_ANGLE / Mathf.PI );
			int		MaxIndex = Mathf.FloorToInt( (_PhaseFunction.Length-1) * PHASE_END_ANGLE / Mathf.PI );

			// Compute integral of provided function
			double	fIntegral = 0.0;
			for ( int Index=0; Index < PHASE_TEXTURE_SIZE; Index++ )
			{
				int	OriginalPhaseIndex = MinIndex + (MaxIndex - MinIndex) * Index / (PHASE_TEXTURE_SIZE-1);
				fIntegral += _PhaseFunction[OriginalPhaseIndex];
			}

			fIntegral *= Math.PI / PHASE_TEXTURE_SIZE;	// * dTheta
			fIntegral *= 2.0 * Math.PI;
			fIntegral = 1.0 / fIntegral;

			// Copy source function into collapsed table
			float[]	PhaseFactors = new float[PHASE_TEXTURE_SIZE];
			double	IntegralCheck = 0.0;
			for ( int Index=0; Index < PHASE_TEXTURE_SIZE; Index++ )
			{
				int		OriginalPhaseIndex = MinIndex + (MaxIndex - MinIndex) * Index / PHASE_TEXTURE_SIZE;
				PhaseFactors[Index] = (float) (_PhaseFunction[OriginalPhaseIndex] * fIntegral);

				IntegralCheck += PhaseFactors[Index];
			}
			IntegralCheck *= Math.PI / PHASE_TEXTURE_SIZE;	// * dTheta
			IntegralCheck *= 2.0 * Math.PI;

			// Create phase function for 0- and single-scattering
			Color[]	Pixels = new Color[PHASE_TEXTURE_SIZE];
			for ( int i=0; i < PHASE_TEXTURE_SIZE; i++ )
			{
				float	Value = PhaseFactors[i] * 256.0f;
				float	R = Mathf.Floor( Value );
				float	G = Value - R;
				Pixels[i] = new Color( R / 256.0f, G, 0.0f, 0.0f );
			}

			// Build the convolved phase function for double-scattering
			double[]	PhaseConvolved = new double[PHASE_TEXTURE_SIZE];
			double		DeltaAngle = Math.PI / PHASE_TEXTURE_SIZE;
			for ( int AngleIndex0=0; AngleIndex0 < PHASE_TEXTURE_SIZE; AngleIndex0++ )
			{
				double	Phase0 = PhaseFactors[AngleIndex0];
				double	Convolution = 0.0;
				for ( int AngleIndex1=0; AngleIndex1 < PHASE_TEXTURE_SIZE; AngleIndex1++ )
					Convolution += Phase0 * PhaseFactors[(PHASE_TEXTURE_SIZE + AngleIndex0 - AngleIndex1) % PHASE_TEXTURE_SIZE];

				PhaseConvolved[AngleIndex0] = (float) (DeltaAngle * Convolution);
			}

			for ( int i=0; i < PHASE_TEXTURE_SIZE; i++ )
			{
				float	Value = (float) (PhaseConvolved[i] * 256.0);
				float	B = Mathf.Floor( Value );
				float	A = Value - B;
				Pixels[i].b = B / 256.0f;
				Pixels[i].a = A;
			}

			// Build texture
			m_TexturePhase = Help.CreateTexture( "Layered Clouds Phase Function", PHASE_TEXTURE_SIZE, 1, TextureFormat.ARGB32, false, FilterMode.Bilinear, TextureWrapMode.Clamp );
			m_TexturePhase.SetPixels( 0, 0, PHASE_TEXTURE_SIZE, 1, Pixels, 0 );
			m_TexturePhase.Apply();
		}

		#endregion

		#endregion
	}
}