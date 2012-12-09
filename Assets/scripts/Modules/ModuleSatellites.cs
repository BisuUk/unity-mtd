using System;
using System.Collections.Generic;
using UnityEngine;

namespace Nuaj
{
	/// <summary>
	/// This module is responsible for the display of planetary satellites.
	/// Some example of satellites are the Moon, the Sun but also the cosmological background with stars and the milky way.
	/// </summary>
	[Serializable]
	public class ModuleSatellites : ModuleBase, IComparer<ModuleSatellites.SatelliteBase>
	{
		#region NESTED TYPES

		/// <summary>
		/// The type of available satellites
		/// </summary>
		public enum SATELLITE_TYPE
		{
			/// <summary>
			/// A standard planetary body like the moon
			/// This object uses a simple 2D texture mapped on a quad.
			/// </summary>
			PLANETARY_BODY,		// Own lighting
			/// <summary>
			/// A star like the Sun
			/// This object uses a simple 2D texture mapped on a quad.
			/// </summary>
			NEARBY_STAR,		//
			/// <summary>
			/// A cosmic background like stars, a nebula or some galaxies
			/// This object uses a cube map
			/// </summary>
			BACKGROUND,
		}

		/// <summary>
		/// The base satellite class.
		/// </summary>
		public abstract class	SatelliteBase : IMonoBehaviour
		{
			#region CONSTANTS

			protected static readonly string	DEFAULT_NAME = "No Name";

			// DEFAULT VALUES
			protected const float				DEFAULT_TILT_ANGLE = 0.0f;
			protected static readonly Vector3	DEFAULT_ROTATION_AXIS = new Vector3( 1, 1, 0 ).normalized;
			protected const float				DEFAULT_REVOLUTION_ANGLE = -50.0f * Mathf.Deg2Rad;	// Slightly slanted
			protected const float				DEFAULT_REVOLUTION_PERIOD = 60.0f;					// One minute for a full cycle
			protected const bool				DEFAULT_SIMULATE = false;

			#endregion

			#region FIELDS

			protected ModuleSatellites		m_Owner = null;

			[SerializeField] protected bool			m_bEnabled = true;
			[SerializeField] protected string		m_Name = DEFAULT_NAME;

			// Positioning
			[SerializeField] protected float		m_DistanceFromPlanetMKm = +float.MaxValue;
			[SerializeField] protected float		m_TiltAngle = DEFAULT_TILT_ANGLE;
			[SerializeField] protected Vector3		m_RotationAxisY = DEFAULT_ROTATION_AXIS;
			[SerializeField] protected float		m_RevolutionAngle = DEFAULT_REVOLUTION_ANGLE;
			[SerializeField] protected float		m_RevolutionPeriod = DEFAULT_REVOLUTION_PERIOD;
			[SerializeField] protected bool			m_bSimulateCycle = DEFAULT_SIMULATE;

			// Lighting
			[SerializeField] protected float		m_Luminance = 1.0f;

			// Internal data
			protected Vector3				m_RotationAxisX;
			protected Vector3				m_RotationAxisZ;
			protected Vector3				m_Direction = Vector3.zero;	// Our very own position accumulator
			protected Vector3				m_Tangent;
			protected Vector3				m_BiTangent;

			#endregion

			#region PROPERTIES

			internal ModuleSatellites		Owner
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
			/// Enables or disables the satellite
			/// </summary>
			public bool						Enabled
			{
				get { return m_bEnabled; }
				set
				{
					if ( value == m_bEnabled )
						return;

					m_bEnabled = value;
					m_Owner.ListsNeedUpdate();
				}
			}

			/// <summary>
			/// Gets or sets the name of the satellite
			/// </summary>
			public string					Name
			{
				get { return m_Name; }
				set { m_Name = value != null ? value : DEFAULT_NAME; }
			}

			/// <summary>
			/// Gets or sets the satellite's distance to the planet in millions of kilometers.
			/// This is used to order the rendering of satellites.
			/// </summary>
			public float					DistanceFromPlanetMKm
			{
				get { return m_DistanceFromPlanetMKm; }
				set
				{
					if ( Mathf.Approximately( value, m_DistanceFromPlanetMKm ) )
						return;

					m_DistanceFromPlanetMKm = value;
					m_Owner.ListsNeedUpdate();
				}
			}

			/// <summary>
			/// Gets or sets the satellite's tilt angle (in radians).
			/// This allows to make the satellites rotate about their axis.
			/// </summary>
			public float					TiltAngle
			{
				get { return m_TiltAngle; }
				set
				{
					if ( Mathf.Approximately( value, m_TiltAngle ) )
						return;

					m_TiltAngle = value;
					UpdateCachedValues();
				}
			}

			#region Revolution Parameters

			/// <summary>
			/// Gets or sets the axis about which the satellites revolves.
			/// </summary>
			public Vector3					RotationAxis
			{
				get { return m_RotationAxisY; }
				set
				{
					if ( value.sqrMagnitude > 1e-6f )
						value.Normalize();
					else
						value = Vector3.right;
					if ( Help.Approximately( value, m_RotationAxisY ) )
						return;

					m_RotationAxisY = value;
					UpdateCachedValues();
				}
			}

			/// <summary>
			/// Gets or sets the revolution angle in radians
			/// </summary>
			public float					RevolutionAngle
			{
				get { return m_RevolutionAngle; }
				set
				{
					if ( Mathf.Approximately( value, m_RevolutionAngle ) )
						return;

					m_RevolutionAngle = value;
					UpdateCachedValues();
				}
			}

			/// <summary>
			/// Gets or sets the revolution time in seconds (this in fact sets the satellite's angle based on this time value and the revolution period)
			/// </summary>
			public float					RevolutionTime
			{
				get { return 0.5f * m_RevolutionAngle * m_RevolutionPeriod / Mathf.PI; }
				set
				{
					if ( Mathf.Approximately( value, RevolutionTime ) )
						return;

					RevolutionAngle = 2.0f * Mathf.PI * value / m_RevolutionPeriod;
				}
			}

			/// <summary>
			/// Gets or sets the revolution period in seconds it takes the satellite to perform an entire revolution
			/// </summary>
			public float					RevolutionPeriod
			{
				get { return m_RevolutionPeriod; }
				set
				{
					if ( Math.Abs( value ) < 1e-4f )
						value = Math.Sign( value ) * 1e-4f;
					if ( Mathf.Approximately( value, m_RevolutionPeriod ) )
						return;

					m_RevolutionPeriod = value;
					UpdateCachedValues();
				}
			}

			/// <summary>
			/// Gets or sets the state that tells if the satellite should simulate its own revolution cycle.
			/// If true, RevolutionTime will be increased automatically and the satellite will rotate about its revolution axis and complete a full revolution in the time specified by RevolutionPeriod.
			/// If false, RevolutionTime is set manually.
			/// </summary>
			public bool						SimulateCycle
			{
				get { return m_bSimulateCycle; }
				set { m_bSimulateCycle = value; }
			}

			/// <summary>
			/// Gets or sets the satellite's direction in WORLD space.
			/// NOTE: This value is automatically updated when RevolutionTime, RevolutionAngle or RotationAxis is changed.
			/// This means it's updated automatically every frame if SimulateCycle is set to "true".
			/// </summary>
			public Vector3					Direction
			{
				get { return m_Direction; }
				set
				{
					value.Normalize();
					if ( Help.Approximately( value, m_Direction ) )
						return;

					m_Direction = value;

					// Recompute revolution angle
					m_RevolutionAngle = Mathf.Atan2( Vector3.Dot( m_Direction, m_RotationAxisX ), Vector3.Dot( m_Direction, m_RotationAxisZ ) );
				}
			}

			#endregion

			/// <summary>
			/// Gets or sets the satellite's luminance.
			/// A white pixel will emit that luminance.
			/// NOTE: Be careful not to set a strong luminance here, otherwise your satellites will show during daytime.
			/// The correct way to proceed is to set a very low luminance level compared to the Sun's luminance, then to
			///  tweak the tone mapping so it adapts to these low luminance levels at night.
			/// </summary>
			public float					Luminance
			{
				get { return m_Luminance; }
				set { m_Luminance = value; }
			}

			#endregion

			#region METHODS

			public	SatelliteBase()
			{
			}
		
			#region IMonoBehaviour Members

			public virtual void  OnDestroy()
			{
			}

			public virtual void Awake()
			{
			}

			public virtual void	Start()
			{
			}

			public virtual void  OnEnable()
			{
				UpdateCachedValues();
			}

			public virtual void  OnDisable()
			{
			}

			public virtual void  Update()
			{
				if ( m_bSimulateCycle )
					RevolutionTime += NuajTime.DeltaTime;
			}

			#endregion

			public virtual void	Render()
			{
				Help.LogError( "THIS SHOULDN'T BE CALLED !!! (Name = " + m_Name + ")" );
			}

			public virtual void	RenderEnvironment()
			{
				Help.LogError( "THIS SHOULDN'T BE CALLED !!! (Name = " + m_Name + ")" );
			}

			/// <summary>
			/// Resets the satellite's parameters
			/// </summary>
			public virtual void	Reset()
			{
				DistanceFromPlanetMKm = +float.MaxValue;
				RotationAxis = DEFAULT_ROTATION_AXIS;
				RevolutionAngle = DEFAULT_REVOLUTION_ANGLE;
				RevolutionPeriod = DEFAULT_REVOLUTION_PERIOD;
				SimulateCycle = DEFAULT_SIMULATE;
				Luminance = 1.0f;
			}

			protected virtual void	UpdateCachedValues()
			{
 				// Recompute tangent space from revolution axis
				float	DotX = Vector3.Dot( Vector3.right, m_RotationAxisY );
				float	DotZ = Vector3.Dot( Vector3.forward, m_RotationAxisY );
				if ( Math.Abs( DotX ) < Math.Abs( DotZ ) )
				{	// Use X axis as reference
					m_RotationAxisZ = Vector3.Cross( Vector3.right, m_RotationAxisY ).normalized;
					m_RotationAxisX = Vector3.Cross( m_RotationAxisY, m_RotationAxisZ );
				}
				else
				{	// Use Z axis as reference
					m_RotationAxisX = Vector3.Cross( m_RotationAxisY, Vector3.forward ).normalized;
					m_RotationAxisZ = Vector3.Cross( m_RotationAxisX, m_RotationAxisY );
				}

				// Update satellite direction & tangent space
				m_Direction = Mathf.Cos( m_RevolutionAngle ) * m_RotationAxisZ + Mathf.Sin( m_RevolutionAngle ) * m_RotationAxisX;
				Vector3	TempBiTangent = Vector3.Cross( m_Direction, m_RotationAxisY );

				float	CosTilt = Mathf.Cos( m_TiltAngle );
				float	SinTilt = Mathf.Sin( m_TiltAngle );
				m_Tangent = CosTilt * m_RotationAxisY + SinTilt * TempBiTangent;
				m_BiTangent = -SinTilt * m_RotationAxisY + CosTilt * TempBiTangent;
			}

			#endregion
		}

		/// <summary>
		/// The planetary body satellite type
		/// This object uses a simple 2D texture mapped to a quad.
		/// If the 2D billboard is a circle then this satellite can also simulate its own lighting as if the satellite was a celestial sphere.
		/// NOTE: Billboards are displayed with alpha blending so use alpha channel to carve out the transparent pixels.
		/// </summary>
		[Serializable]
		public class	SatellitePlanetaryBody : SatelliteBase
		{
			#region CONSTANTS

			// DEFAULT VALUES
			protected const float	DEFAULT_DISTANCE = 1.0f;
			protected const float	DEFAULT_ALBEDO = 0.05f;	// Typical albedo for the moon
			protected const float	DEFAULT_DISPLAY_SIZE = 65.0f;
			protected const float	DEFAULT_ASPECT_RATIO = 1.0f;
			protected static readonly Vector2	DEFAULT_TOP_LEFT_CORNER = Vector2.zero;
			protected static readonly Vector2	DEFAULT_SIZE = Vector2.one;
			protected const bool	DEFAULT_SIMULATE_LIGHTING = true;
			protected const bool	DEFAULT_USE_SUN_LUMINANCE = true;
			protected const float	DEFAULT_SURFACE_ROUGHNESS = 0.8f;

			#endregion

			#region FIELDS

			[SerializeField] protected float			m_DisplaySize = DEFAULT_DISPLAY_SIZE;
			[SerializeField] protected float			m_AspectRatio = DEFAULT_ASPECT_RATIO;
			[SerializeField] protected NuajTexture2D	m_TextureDiffuse = new NuajTexture2D();
			[SerializeField] protected Vector2			m_TopLeftCorner = DEFAULT_TOP_LEFT_CORNER;
			[SerializeField] protected Vector2			m_Size = DEFAULT_SIZE;

			// Lighting
			[SerializeField] protected bool				m_bSimulateLighting = DEFAULT_SIMULATE_LIGHTING;
			[SerializeField] protected bool				m_bUseSunLuminance = DEFAULT_USE_SUN_LUMINANCE;
			[SerializeField] protected float			m_SurfaceRoughness = DEFAULT_SURFACE_ROUGHNESS;
			[SerializeField] protected NuajTexture2D	m_TextureNormal = new NuajTexture2D();
			[SerializeField] protected Color			m_Albedo = new Color( DEFAULT_ALBEDO, DEFAULT_ALBEDO, DEFAULT_ALBEDO, 1.0f );


			// Internal data
			protected Vector2				m_OrenNayarCoefficients;

			#endregion

			#region PROPERTIES

			/// <summary>
			/// Gets or sets the diffuse texture that will be displayed as satellite
			/// </summary>
			public Texture2D				TextureDiffuse
			{
				get { return m_TextureDiffuse.Texture; }
				set { m_TextureDiffuse.Texture = value; }
			}

			/// <summary>
			/// Gets or sets the display size in pixels
			/// </summary>
			public float					DisplaySize
			{
				get { return m_DisplaySize; }
				set { m_DisplaySize = value; }
			}

			/// <summary>
			/// Gets or sets the satellite's aspect ratio
			/// </summary>
			public float					AspectRatio
			{
				get { return m_AspectRatio; }
				set { m_AspectRatio = value; }
			}

			/// <summary>
			/// Gets or sets the top left corner of the image (in normalized [0,1] UV coordinates)
			/// </summary>
			public Vector2					TopLeftCorner
			{
				get { return m_TopLeftCorner; }
				set { m_TopLeftCorner = value; }
			}

			/// <summary>
			/// Gets or sets the size of the image (in normalized [0,1] UV coordinates)
			/// </summary>
			public Vector2					Size
			{
				get { return m_Size; }
				set { m_Size = value; }
			}

			/// <summary>
			/// Gets or sets the albedo of the satellite. Normally in [0,1] but I don't impose anything here.
			/// The albedo is the reflection coefficient of a surface (cf. http://en.wikipedia.org/wiki/Albedo)
			/// For example, the average albedo of the Moon is 0.12
			/// NOTE: The alpha modulates the global satellite's transparency
			/// </summary>
			public Color					Albedo
			{
				get { return m_Albedo; }
				set { m_Albedo = value; }
			}

			#region Lighting

			/// <summary>
			/// Gets or sets the flag that enables lighting simulation of the satellite.
			/// This works well if your satellite is a disc and the texture you use is not already lit.
			/// A good example of a suitable texture would be http://apod.nasa.gov/apod/image/9904/fullmoon_lick_big.jpg
			/// </summary>
			public bool						SimulateLighting
			{
				get { return m_bSimulateLighting; }
				set { m_bSimulateLighting = value; }
			}

			/// <summary>
			/// Gets or sets the state that tells if we should use the luminance of the Sun to perform lighting
			/// </summary>
			public bool						UseSunLuminance
			{
				get { return m_bUseSunLuminance; }
				set { m_bUseSunLuminance = value; }
			}

			/// <summary>
			/// Gets or sets the surface roughness.
			/// A value of 0 is a smooth surface while 1 is a rough and irregular surface.
			/// For satellites with dusty surfaces like the moon, a good value would be 0.8 (very rough).
			/// </summary>
			public float					SurfaceRoughness
			{
				get { return m_SurfaceRoughness; }
				set
				{
					m_SurfaceRoughness = Mathf.Clamp01( value );

					// Update Oren-Nayar coefficients (cf. http://en.wikipedia.org/wiki/Oren%E2%80%93Nayar_reflectance_model)
					float	Sigma2 = m_SurfaceRoughness * m_SurfaceRoughness;
					m_OrenNayarCoefficients = new Vector2(
							1.0f - 0.5f * Sigma2 / (Sigma2 + 0.33f),
							0.45f * Sigma2 / (Sigma2 + 0.09f)
						);
				}
			}

			/// <summary>
			/// Gets or sets an optional normal texture used if lighting is enabled
			/// </summary>
			public Texture2D				TextureNormal
			{
				get { return m_TextureNormal.Texture; }
				set { m_TextureNormal.Texture = value; }
			}

			#endregion

			#endregion

			#region METHODS

			public	SatellitePlanetaryBody() : base()
			{
				m_DistanceFromPlanetMKm = DEFAULT_DISTANCE;
				SurfaceRoughness = SurfaceRoughness;	// Should update internal coefficients
			}

			public override void Awake()
			{
				base.Awake();

				// Use a default texture if none is set
				if ( TextureDiffuse == null )
					TextureDiffuse = Help.LoadTextureResource( "Satellites/PlanetaryBodies/Moon512x512" );
			}

			public override void Render()
			{
				if ( m_Owner.m_Owner == null )
					return;	// When using a prefab, the module's owner is invalid

				NuajMaterial	M = m_Owner.m_Material;
				M.SetVector( "_Direction", m_Direction );
				M.SetVector( "_Tangent", m_Tangent );
				M.SetVector( "_BiTangent", m_BiTangent );
				M.SetFloat( "_Luminance", m_bSimulateLighting && m_bUseSunLuminance ? m_Owner.m_Owner.SunIntensity : m_Luminance );
				M.SetVector( "_Size", m_DisplaySize / m_Owner.m_ScreenHeight * new Vector2( m_AspectRatio, 1.0f ) );
				M.SetVector( "_UV", new Vector4( m_TopLeftCorner.x, m_TopLeftCorner.y, m_Size.x, m_Size.y ) );
				M.SetTexture( "_TexDiffuse", m_TextureDiffuse, true );
				M.SetColor( "_Albedo", m_Albedo );
				if ( m_bSimulateLighting )
				{
					M.SetVector( "_OrenNayarCoefficients", m_OrenNayarCoefficients );
					M.SetTexture( "_TexNormal", m_TextureNormal, true );
				}
				M.SetPass( m_bSimulateLighting ? 1 : 0 );

				GL.Begin( GL.QUADS );
				GL.TexCoord2( -1.0f, -1.0f );
				GL.Vertex3( 0.0f, 0.0f, 0.0f );
				GL.TexCoord2( -1.0f, +1.0f );
				GL.Vertex3( 0.0f, 0.0f, 0.0f );
				GL.TexCoord2( +1.0f, +1.0f );
				GL.Vertex3( 0.0f, 0.0f, 0.0f );
				GL.TexCoord2( +1.0f, -1.0f );
				GL.Vertex3( 0.0f, 0.0f, 0.0f );
				GL.End();
			}

			public override void RenderEnvironment()
			{
				if ( m_Owner.m_Owner == null )
					return;	// When using a prefab, the module's owner is invalid

				NuajMaterial	M = m_Owner.m_Material;
				M.SetVector( "_Direction", m_Direction );
				M.SetVector( "_Tangent", m_Tangent );
				M.SetVector( "_BiTangent", m_BiTangent );
				M.SetFloat( "_Luminance", m_bSimulateLighting && m_bUseSunLuminance ? m_Owner.m_Owner.SunIntensity : m_Luminance );
				M.SetVector( "_Size", m_DisplaySize / m_Owner.m_ScreenHeight * new Vector2( m_AspectRatio, 1.0f ) );
				M.SetVector( "_UV", new Vector4( m_TopLeftCorner.x, m_TopLeftCorner.y, m_Size.x, m_Size.y ) );
				M.SetTexture( "_TexDiffuse", m_TextureDiffuse, true );
				M.SetColor( "_Albedo", m_Albedo );
				if ( m_bSimulateLighting )
				{
					M.SetVector( "_OrenNayarCoefficients", m_OrenNayarCoefficients );
					M.SetTexture( "_TexNormal", m_TextureNormal, true );
				}
				M.SetFloat( "_bSimulateLighting", m_bSimulateLighting ? 1 : 0 );
				M.SetPass( 4 );

				GL.Begin( GL.QUADS );
				GL.TexCoord2( 0.0f, 1.0f );
				GL.Vertex3( -1.0f, -1.0f, 0.0f );
				GL.TexCoord2( 0.0f, 0.0f );
				GL.Vertex3( -1.0f, +1.0f, 0.0f );
				GL.TexCoord2( 1.0f, 0.0f );
				GL.Vertex3( +1.0f, +1.0f, 0.0f );
				GL.TexCoord2( 1.0f, 1.0f );
				GL.Vertex3( +1.0f, -1.0f, 0.0f );
				GL.End();
			}

			public override void Reset()
			{
				base.Reset();

				DistanceFromPlanetMKm = DEFAULT_DISTANCE;
				Albedo = new Color( DEFAULT_ALBEDO, DEFAULT_ALBEDO, DEFAULT_ALBEDO, 1.0f );
				DisplaySize = DEFAULT_DISPLAY_SIZE;
				AspectRatio = DEFAULT_ASPECT_RATIO;
				TopLeftCorner = DEFAULT_TOP_LEFT_CORNER;
				Size = DEFAULT_SIZE;
				SimulateLighting = DEFAULT_SIMULATE_LIGHTING;
				UseSunLuminance = DEFAULT_USE_SUN_LUMINANCE;
				SurfaceRoughness = DEFAULT_SURFACE_ROUGHNESS;
			}

			#endregion
		}

		/// <summary>
		/// The nearby star satellite type
		/// This object uses a simple 2D texture mapped to a quad that emits light.
		/// NOTE: Billboards are displayed with alpha blending so use alpha channel to carve out the transparent pixels.
		/// </summary>
		[Serializable]
		public class	SatelliteStar : SatelliteBase
		{
			#region CONSTANTS

			// DEFAULT VALUES
			protected const float	DEFAULT_DISTANCE = 185.0f;	// Typical distance for the Sun
			protected const float	DEFAULT_DISPLAY_SIZE = 30.0f;
			protected const float	DEFAULT_ASPECT_RATIO = 1.0f;
			protected static readonly Vector2	DEFAULT_TOP_LEFT_CORNER = Vector2.zero;
			protected static readonly Vector2	DEFAULT_SIZE = Vector2.one;
			protected const bool	DEFAULT_SUN_DRIVES_SATELLITE = true;
			protected const bool	DEFAULT_SATELLITE_DRIVES_SUN = false;
			protected const bool	DEFAULT_USE_SUN_LUMINANCE = true;

			#endregion

			#region FIELDS

			[SerializeField] protected float			m_DisplaySize = DEFAULT_DISPLAY_SIZE;
			[SerializeField] protected float			m_AspectRatio = DEFAULT_ASPECT_RATIO;
			[SerializeField] protected NuajTexture2D	m_TextureEmissive = new NuajTexture2D();
			[SerializeField] protected Vector2			m_TopLeftCorner = DEFAULT_TOP_LEFT_CORNER;
			[SerializeField] protected Vector2			m_Size = DEFAULT_SIZE;
			[SerializeField] protected bool				m_bSunDrivesSatellite = DEFAULT_SUN_DRIVES_SATELLITE;
			[SerializeField] protected bool				m_bSatelliteDrivesSun = DEFAULT_SATELLITE_DRIVES_SUN;
			[SerializeField] protected bool				m_bUseSunLuminance = DEFAULT_USE_SUN_LUMINANCE;

			#endregion

			#region PROPERTIES

			/// <summary>
			/// Gets or sets the emissive texture that will be displayed as satellite
			/// </summary>
			public Texture2D				TextureEmissive
			{
				get { return m_TextureEmissive.Texture; }
				set { m_TextureEmissive.Texture = value; }
			}

			/// <summary>
			/// Gets or sets the display size in pixels
			/// </summary>
			public float					DisplaySize
			{
				get { return m_DisplaySize; }
				set { m_DisplaySize = value; }
			}

			/// <summary>
			/// Gets or sets the satellite's aspect ratio
			/// </summary>
			public float					AspectRatio
			{
				get { return m_AspectRatio; }
				set { m_AspectRatio = value; }
			}

			/// <summary>
			/// Gets or sets the top left corner of the image (in normalized [0,1] UV coordinates)
			/// </summary>
			public Vector2					TopLeftCorner
			{
				get { return m_TopLeftCorner; }
				set { m_TopLeftCorner = value; }
			}

			/// <summary>
			/// Gets or sets the size of the image (in normalized [0,1] UV coordinates)
			/// </summary>
			public Vector2					Size
			{
				get { return m_Size; }
				set { m_Size = value; }
			}

			/// <summary>
			/// Gets or sets the state that tells if the Sun should drive the satellite's position
			/// </summary>
			public bool						SunDrivesSatellite
			{
				get { return m_bSunDrivesSatellite; }
				set
				{
					if ( value == m_bSunDrivesSatellite )
						return;

					m_bSunDrivesSatellite = value;
					if ( m_bSunDrivesSatellite && m_bSatelliteDrivesSun )
						m_bSatelliteDrivesSun = false;
					Update();
				}
			}

			/// <summary>
			/// Gets or sets the state that tells if the Sun should drive the satellite's position
			/// </summary>
			public bool						SatelliteDrivesSun
			{
				get { return m_bSatelliteDrivesSun; }
				set
				{
					if ( m_bSatelliteDrivesSun )
						return;

					m_bSatelliteDrivesSun = value;
					if ( m_bSatelliteDrivesSun && m_bSunDrivesSatellite )
						m_bSunDrivesSatellite = false;
					Update();
				}
			}

			/// <summary>
			/// Gets or sets the state that tells if we should use the same luminance as the Sun
			/// </summary>
			public bool						UseSunLuminance
			{
				get { return m_bUseSunLuminance; }
				set { m_bUseSunLuminance = value; }
			}

			#endregion

			#region METHODS

			public	SatelliteStar() : base()
			{
				m_DistanceFromPlanetMKm = DEFAULT_DISTANCE;
			}

			public override void Awake()
			{
				base.Awake();

				// Use a default texture if none is set
				if ( TextureEmissive == null )
					TextureEmissive = Help.LoadTextureResource( "Satellites/Stars/Sun256x256" );
			}

			public override void Update()
			{
				base.Update();
				if ( m_Owner.m_Owner == null )
					return;	// When using a prefab, the module's owner is invalid

				// Make the Sun follow the satellite
				if ( m_bSatelliteDrivesSun )
					m_Owner.m_Owner.SunDirection = Direction;
				else if ( m_bSunDrivesSatellite )
					UpdateCachedValues();	// This should rebuild the tangent space based on current Sun position
			}

			public override void Render()
			{
				if ( m_Owner.m_Owner == null )
					return;	// When using a prefab, the module's owner is invalid

				NuajMaterial	M = m_Owner.m_Material;
				M.SetVector( "_Direction", m_Direction );
				M.SetVector( "_Tangent", m_Tangent );
				M.SetVector( "_BiTangent", m_BiTangent );
				M.SetFloat( "_DistanceMKm", m_DistanceFromPlanetMKm );
				M.SetFloat( "_Luminance", m_bUseSunLuminance ? m_Owner.m_Owner.SunIntensity : m_Luminance );
				M.SetVector( "_Size", m_DisplaySize / m_Owner.m_ScreenHeight * new Vector2( m_AspectRatio, 1.0f ) );
				M.SetVector( "_UV", new Vector4( m_TopLeftCorner.x, m_TopLeftCorner.y, m_Size.x, m_Size.y ) );
				M.SetTexture( "_TexEmissive", m_TextureEmissive, true );
				M.SetPass( 2 );

				GL.Begin( GL.QUADS );
				GL.TexCoord2( -1.0f, -1.0f );
				GL.Vertex3( 0.0f, 0.0f, 0.0f );
				GL.TexCoord2( -1.0f, +1.0f );
				GL.Vertex3( 0.0f, 0.0f, 0.0f );
				GL.TexCoord2( +1.0f, +1.0f );
				GL.Vertex3( 0.0f, 0.0f, 0.0f );
				GL.TexCoord2( +1.0f, -1.0f );
				GL.Vertex3( 0.0f, 0.0f, 0.0f );
				GL.End();
			}

			public override void RenderEnvironment()
			{
				if ( m_Owner.m_Owner == null )
					return;	// When using a prefab, the module's owner is invalid
				if ( m_bUseSunLuminance )
					return;	// This means it's the Sun we're drawing here... We don't render the Sun in the envmap !

				NuajMaterial	M = m_Owner.m_Material;
				M.SetVector( "_Direction", m_Direction );
				M.SetVector( "_Tangent", m_Tangent );
				M.SetVector( "_BiTangent", m_BiTangent );
				M.SetFloat( "_DistanceMKm", m_DistanceFromPlanetMKm );
				M.SetFloat( "_Luminance", m_bUseSunLuminance ? m_Owner.m_Owner.SunIntensity : m_Luminance );
				M.SetVector( "_Size", m_DisplaySize / m_Owner.m_ScreenHeight * new Vector2( m_AspectRatio, 1.0f ) );
				M.SetVector( "_UV", new Vector4( m_TopLeftCorner.x, m_TopLeftCorner.y, m_Size.x, m_Size.y ) );
				M.SetTexture( "_TexEmissive", m_TextureEmissive, true );
				M.SetPass( 5 );

				GL.Begin( GL.QUADS );
				GL.TexCoord2( 0.0f, 1.0f );
				GL.Vertex3( -1.0f, -1.0f, 0.0f );
				GL.TexCoord2( 0.0f, 0.0f );
				GL.Vertex3( -1.0f, +1.0f, 0.0f );
				GL.TexCoord2( 1.0f, 0.0f );
				GL.Vertex3( +1.0f, +1.0f, 0.0f );
				GL.TexCoord2( 1.0f, 1.0f );
				GL.Vertex3( +1.0f, -1.0f, 0.0f );
				GL.End();
			}

			public override void Reset()
			{
				base.Reset();

				DistanceFromPlanetMKm = DEFAULT_DISTANCE;
				DisplaySize = DEFAULT_DISPLAY_SIZE;
				AspectRatio = DEFAULT_ASPECT_RATIO;
				TopLeftCorner = DEFAULT_TOP_LEFT_CORNER;
				Size = DEFAULT_SIZE;
				SunDrivesSatellite = DEFAULT_SUN_DRIVES_SATELLITE;
				SatelliteDrivesSun = DEFAULT_SATELLITE_DRIVES_SUN;
				UseSunLuminance = DEFAULT_USE_SUN_LUMINANCE;
			}

			/// <summary>
			/// This is a little helper that computes the Sun's direction in WORLD space given a time of day and the observer's position on the surface of the Earth
			/// </summary>
			/// <param name="_Longitude">The observer's longitude (in radians)</param>
			/// <param name="_Latitude">The observer's latitude (in radians)</param>
			/// <param name="_JulianDay">The observation date in Julian days (i.e. the day of the year in [0,365])</param>
			/// <param name="_TimeOfDay">The observation time in hours, in [0,24]</param>
			/// <returns>The Sun's direction in WORLD space, directly pluggable into NuajManager.SunDirection</returns>
			public static Vector3	ComputeSunPosition( float _Longitude, float _Latitude, int _JulianDay, float _TimeOfDay )
			{
				// Compute solar time
				float	fSolarTime = _TimeOfDay + 0.17f * Mathf.Sin( 4.0f * Mathf.PI * (_JulianDay - 80) / 373 ) - 0.129f * Mathf.Sin( 2.0f * Mathf.PI * (_JulianDay - 8) / 355 ) - 12.0f * _Longitude / Mathf.PI;

				// Compute solar declination
				float	fSolarDeclination = 0.4093f * Mathf.Sin( 2.0f * Mathf.PI * (_JulianDay - 81) / 368 );

				// Compute solar angles
				Vector2	PhiTheta = new Vector2(	Mathf.Atan2( -Mathf.Cos( fSolarDeclination ) * Mathf.Sin( Mathf.PI * fSolarTime / 12 ), Mathf.Cos( _Latitude ) * Mathf.Sin( fSolarDeclination ) - Mathf.Sin( _Latitude ) * Mathf.Cos( fSolarDeclination ) * Mathf.Cos( Mathf.PI * fSolarTime / 12.0f ) ),
												Mathf.Acos( Mathf.Sin( _Latitude ) * Mathf.Sin( fSolarDeclination ) - Mathf.Cos( _Latitude ) * Mathf.Cos( fSolarDeclination ) * Mathf.Cos( Mathf.PI * fSolarTime / 12 ) ) );

				// Transform into a WORLD direction
				float	CosPhi = Mathf.Cos( PhiTheta.x );
				float	SinPhi = Mathf.Sin( PhiTheta.x );
				float	CosTheta = Mathf.Cos( PhiTheta.y );
				float	SinTheta = Mathf.Sin( PhiTheta.y );
				return new Vector3( SinPhi * SinTheta, CosTheta, CosPhi * SinTheta );
			}

			protected override void UpdateCachedValues()
			{
				if ( m_Owner.m_Owner == null )
					return;	// When using a prefab, the module's owner is invalid

				if ( !m_bSunDrivesSatellite )
				{	// Default...
					base.UpdateCachedValues();
					return;
				}

				// Make the satellite follow the Sun
				m_RotationAxisZ = m_Owner.m_Owner.SunDirection;

				// Simple face-cam
				m_RotationAxisX = m_Owner.m_Owner.Camera2World.GetColumn( 0 );
				m_RotationAxisY = m_Owner.m_Owner.Camera2World.GetColumn( 1 );

				float	CosTilt = Mathf.Cos( m_TiltAngle );
				float	SinTilt = Mathf.Sin( m_TiltAngle );
				m_Tangent = CosTilt * m_RotationAxisX + SinTilt * m_RotationAxisY;
				m_BiTangent = -SinTilt * m_RotationAxisX + CosTilt * m_RotationAxisY;
				m_Direction = m_RotationAxisZ;
			}

			#endregion
		}

		/// <summary>
		/// The cosmic background satellite type
		/// This object uses a cube map that emits light.
		/// NOTE: The cube maps environment is displayed with alpha blending so use alpha channel to carve out the transparent pixels.
		/// </summary>
		[Serializable]
		public class	SatelliteBackground : SatelliteBase
		{
			#region CONSTANTS

			// DEFAULT VALUES
			protected const float	DEFAULT_DISTANCE = 1000.0f;
			protected const float	DEFAULT_LUMINANCE = 0.02f;
			protected const float	DEFAULT_BRIGHTNESS = 0.0f;
			protected const float	DEFAULT_CONTRAST = 0.0f;
			protected const float	DEFAULT_GAMMA = 4.0f;
			protected static readonly Color	DEFAULT_AMBIENT = new Color( 190 / 255.0f, 220 / 255.0f, 255 / 255.0f, 30 / 255.0f );

			#endregion

			#region FIELDS

			[SerializeField] protected NuajCubemap	m_TextureEmissive = new NuajCubemap();
			[SerializeField] protected bool			m_bFlipCubeMapY = false;
			[SerializeField] protected float		m_Brightness = DEFAULT_BRIGHTNESS;
			[SerializeField] protected float		m_Contrast = DEFAULT_CONTRAST;
			[SerializeField] protected float		m_Gamma = DEFAULT_GAMMA;
			[SerializeField] protected Color		m_Ambient = DEFAULT_AMBIENT;

			// Cached ambient value
			protected Vector3		m_AmbientLuminance = Vector3.zero;

			#endregion

			#region PROPERTIES

			/// <summary>
			/// Gets or sets the emissive texture that will be displayed as background
			/// </summary>
			public Cubemap					TextureEmissive
			{
				get { return m_TextureEmissive.CubeMap; }
				set { m_TextureEmissive.CubeMap = value; }
			}

			/// <summary>
			/// Gets or sets the flip flag to flip the cube map vertically
			/// </summary>
			public bool						FlipCubeMapY
			{
				get { return m_bFlipCubeMapY; }
				set { m_bFlipCubeMapY = value; }
			}

			/// <summary>
			/// Gets or sets the brightness applied to the background image
			/// </summary>
			public float					Brightness
			{
				get { return m_Brightness; }
				set { m_Brightness = value; }
			}

			/// <summary>
			/// Gets or sets the contrast applied to the background image
			/// </summary>
			public float					Contrast
			{
				get { return m_Contrast; }
				set { m_Contrast = Mathf.Clamp( value, -1.0f, +1.0f ); }
			}

			/// <summary>
			/// Gets or sets the gamma correction applied to the background image
			/// </summary>
			public float					Gamma
			{
				get { return m_Gamma; }
				set { m_Gamma = value; }
			}

			/// <summary>
			/// Gets or sets the ambient color added to the background image
			/// This helps you to add a small, regular blue tint at night for example
			/// </summary>
			public Color					Ambient
			{
				get { return m_Ambient; }
				set { m_Ambient = value; UpdateCachedValues(); }
			}

			#endregion

			#region METHODS

			public	SatelliteBackground() : base()
			{
				m_Luminance = DEFAULT_LUMINANCE;
				m_DistanceFromPlanetMKm = DEFAULT_DISTANCE;
			}

			public override void Awake()
			{
				base.Awake();

				// Use a default texture if none is set
				if ( TextureEmissive == null )
					TextureEmissive = Help.LoadCubeMapResource( "Satellites/NightSkies/TychoSkymap2048x1024" );
			}

			public override void Render()
			{
				if ( m_Owner.m_Owner == null )
					return;	// When using a prefab, the module's owner is invalid

				NuajMaterial	M = m_Owner.m_Material;
				M.SetVector( "_Direction", m_Direction );
				M.SetVector( "_Tangent", m_Tangent );
				M.SetVector( "_BiTangent", m_BiTangent );
				M.SetFloat( "_Luminance", m_Luminance );
				M.SetFloat( "_Contrast", Mathf.Pow( 2.0f, m_Contrast ) );
				M.SetFloat( "_Brightness", m_Brightness );
				M.SetFloat( "_Gamma", m_Gamma );
				M.SetTexture( "_TexCubeEmissive", m_TextureEmissive, true );
				M.SetFloat( "_FlipCubeMap", m_bFlipCubeMapY ? +1 : -1 );
				M.SetPass( 3 );

				GL.Begin( GL.QUADS );
				GL.TexCoord2( -1.0f, -1.0f );
				GL.Vertex3( 0.0f, 0.0f, 0.0f );
				GL.TexCoord2( -1.0f, +1.0f );
				GL.Vertex3( 0.0f, 0.0f, 0.0f );
				GL.TexCoord2( +1.0f, +1.0f );
				GL.Vertex3( 0.0f, 0.0f, 0.0f );
				GL.TexCoord2( +1.0f, -1.0f );
				GL.Vertex3( 0.0f, 0.0f, 0.0f );
				GL.End();
			}

			public override void RenderEnvironment()
			{
				if ( m_Owner.m_Owner == null )
					return;	// When using a prefab, the module's owner is invalid

				NuajMaterial	M = m_Owner.m_Material;
				M.SetVector( "_Direction", m_Direction );
				M.SetVector( "_Tangent", m_Tangent );
				M.SetVector( "_BiTangent", m_BiTangent );
				M.SetFloat( "_Luminance", m_Luminance );
				M.SetFloat( "_Contrast", Mathf.Pow( 2.0f, m_Contrast ) );
				M.SetFloat( "_Brightness", m_Brightness );
				M.SetFloat( "_Gamma", m_Gamma );
				M.SetTexture( "_TexCubeEmissive", m_TextureEmissive, true );
				M.SetPass( 6 );

				GL.Begin( GL.QUADS );
				GL.TexCoord2( 0.0f, 1.0f );
				GL.Vertex3( -1.0f, -1.0f, 0.0f );
				GL.TexCoord2( 0.0f, 0.0f );
				GL.Vertex3( -1.0f, +1.0f, 0.0f );
				GL.TexCoord2( 1.0f, 0.0f );
				GL.Vertex3( +1.0f, +1.0f, 0.0f );
				GL.TexCoord2( 1.0f, 1.0f );
				GL.Vertex3( +1.0f, -1.0f, 0.0f );
				GL.End();

				// Accumulate a fixed ambient luminance
				m_Owner.m_Owner.AmbientNightSky += m_AmbientLuminance;
			}

			protected override void UpdateCachedValues()
			{
				base.UpdateCachedValues();

				m_AmbientLuminance = 0.001f * m_Luminance * m_Ambient.a * Help.ColorToVec3( m_Ambient );
			}

			public override void Reset()
			{
				base.Reset();

				DistanceFromPlanetMKm = DEFAULT_DISTANCE;
				Luminance = DEFAULT_LUMINANCE;
				FlipCubeMapY = false;
				Brightness = DEFAULT_BRIGHTNESS;
				Contrast = DEFAULT_CONTRAST;
				Gamma = DEFAULT_GAMMA;
				Ambient = DEFAULT_AMBIENT;
			}

			#endregion
		}

		#endregion

		#region FIELDS

		/////////////////////////////////////////////////////////
		// General serializable parameters
		// Here, Unity doesn't seem to be capable of serializing the proper types of my satellites so I have to use as many lists as satellite types
		[SerializeField] protected List<SatellitePlanetaryBody>	m_SatellitesPlanet = new List<SatellitePlanetaryBody>();
		[SerializeField] protected List<SatelliteStar>			m_SatellitesStar = new List<SatelliteStar>();
		[SerializeField] protected List<SatelliteBackground>	m_SatellitesBackground = new List<SatelliteBackground>();

		[SerializeField] protected int	m_SelectedSatelliteIndex = -1;


		/////////////////////////////////////////////////////////
		// Materials
		protected NuajMaterial			m_Material = null;


		// Internal data
		protected List<SatelliteBase>	m_SatellitesGeneric = null;
		protected SatelliteBase[]		m_SortedSatellites = null;

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

				// Also reconnect the satellites' owner
				foreach ( SatelliteBase S in Satellites )
					S.Owner = this;
			}
		}

		/// <summary>
		/// Gets the list of existing satellites
		/// </summary>
		public SatelliteBase[]	Satellites			{ get { return SatellitesGeneric.ToArray(); } }

		/// <summary>
		/// Gets the list of sorted, enabled satellites
		/// </summary>
		public SatelliteBase[]	SortedSatellites
		{
			get
			{
				if ( m_SortedSatellites == null )
				{	// Rebuild the list...
					List<SatelliteBase>	Satellites = new List<SatelliteBase>();
					foreach ( SatelliteBase S in SatellitesGeneric )
						if ( S.Enabled )
							Satellites.Add( S );

					Satellites.Sort( this );
					m_SortedSatellites = Satellites.ToArray();
				}

				return m_SortedSatellites;
			}
		}

		/// <summary>
		/// Gets or sets the satellite currently selected by the user (a GUI thingy really)
		/// </summary>
		public SatelliteBase	SelectedSatellite
		{
			get { return m_SelectedSatelliteIndex >= 0 && m_SelectedSatelliteIndex < SatellitesGeneric.Count ? SatellitesGeneric[m_SelectedSatelliteIndex] : null; }
			set
			{
				if ( value == null )
					m_SelectedSatelliteIndex = -1;
				else
					m_SelectedSatelliteIndex = SatellitesGeneric.IndexOf( value );
			}
		}

		/// <summary>
		/// Gets the amount of existing satellites
		/// </summary>
		public int			SatellitesCount					{ get { return SatellitesGeneric.Count; } }

		/// <summary>
		/// Gets the amount of enabled satellites
		/// </summary>
		public int			EnabledSatellitesCount
		{
			get
			{
				int		Count = 0;
				foreach ( SatelliteBase S in SatellitesGeneric )
					if ( S.Enabled )
						Count++;

				return Count;
			}
		}

		/// <summary>
		/// Internal list of generic satellites, a collage of all specific satellites lists
		/// </summary>
		protected List<SatelliteBase>	SatellitesGeneric
		{
			get
			{
				if ( m_SatellitesGeneric == null || m_SatellitesGeneric.Count != (m_SatellitesPlanet.Count + m_SatellitesStar.Count + m_SatellitesBackground.Count) )
				{	// Rebuild the list
					m_SatellitesGeneric = new List<SatelliteBase>();
					m_SatellitesGeneric.AddRange( m_SatellitesPlanet.ToArray() );
					m_SatellitesGeneric.AddRange( m_SatellitesStar.ToArray() );
					m_SatellitesGeneric.AddRange( m_SatellitesBackground.ToArray() );
				}

				return m_SatellitesGeneric;
			}
		}

		/// <summary>
		/// Occurs when the list of satellites changed
		/// </summary>
		public event EventHandler	SatellitesChanged;

		#endregion

		#region METHODS

		internal	ModuleSatellites( string _Name ) : base( _Name )
		{
		}

		#region IMonoBehaviour Members

		public override void OnDestroy()
		{
			Help.LogDebug( "ModuleSatellites.OnDestroy() !" );

			// Forward to satellites
			foreach ( SatelliteBase S in SatellitesGeneric )
				S.OnDestroy();
		}

		public override void Awake()
		{
			Help.LogDebug( "ModuleSatellites.Awake() !" );

			// Forward to satellites
			foreach ( SatelliteBase S in SatellitesGeneric )
				S.Awake();
		}

		public override void Start()
		{
			Help.LogDebug( "ModuleSatellites.Start() !" );

			// Forward to satellites
			foreach ( SatelliteBase S in SatellitesGeneric )
				S.Start();
		}

		public override void OnEnable()
		{
			Help.LogDebug( "ModuleSatellites.OnEnable() !" );
			try
			{
				m_Material = Help.CreateMaterial( "Satellites/RenderSatellites" );

				ExitErrorState();
			}
			catch ( Exception _e )
			{
				EnterErrorState( "An error occurred while creating the materials for the module.\r\n" + _e.Message );
			}

			// Forward to satellites
			foreach ( SatelliteBase S in SatellitesGeneric )
				S.OnEnable();
		}

		public override void OnDisable()
		{
			Help.LogDebug( "ModuleSatellites.OnDisable() !" );

			// Forward to satellites
			foreach ( SatelliteBase S in SatellitesGeneric )
				S.OnDisable();

			Help.SafeDestroyNuaj( ref m_Material );
		}

		public override void Update()
		{
			// Forward to satellites
			foreach ( SatelliteBase S in SatellitesGeneric )
				S.Update();
		}

		#endregion

		/// <summary>
		/// Adds a new satellite of the specified type
		/// </summary>
		/// <param name="_Type">The type of satellite to create</param>
		/// <param name="_Name">The name of the satellite to create</param>
		/// <param name="_Distance2PlanetMKm">The distance of the satellite from the planet, in millions of kilometers</param>
		/// <returns></returns>
		public SatelliteBase	AddSatellite( SATELLITE_TYPE _Type, string _Name, float _Distance2PlanetMKm )
		{
			// Create in the appropriate list
			SatelliteBase	Result = null;
			switch ( _Type )
			{
				case SATELLITE_TYPE.PLANETARY_BODY:
					{
						SatellitePlanetaryBody	S = new SatellitePlanetaryBody();
						m_SatellitesPlanet.Add( S );
						Result = S;
					}
					break;
				case SATELLITE_TYPE.NEARBY_STAR:
					{
						SatelliteStar	S = new SatelliteStar();
						m_SatellitesStar.Add( S );
						Result = S;
					}
					break;
				case SATELLITE_TYPE.BACKGROUND:
					{
						SatelliteBackground	S = new SatelliteBackground();
						m_SatellitesBackground.Add( S );
						Result = S;
					}
					break;
			}

			ListsNeedUpdate();	// So the lists are rebuilt

			Result.Owner = this;
			Result.Name = _Name;
			Result.DistanceFromPlanetMKm = _Distance2PlanetMKm;

			// Simulate Unity steps
			Result.Awake();
			Result.OnEnable();
			Result.Start();

			// Update selection
			if ( SelectedSatellite == null )
				SelectedSatellite = Result;

			// Notify
			if ( SatellitesChanged != null )
				SatellitesChanged( this, EventArgs.Empty );

			return Result;
		}

		/// <summary>
		/// Removes an existing satellite
		/// </summary>
		/// <param name="_Satellite">The satellite to remove</param>
		public void			RemoveSatellite( SatelliteBase _Satellite )
		{
			if ( !SatellitesGeneric.Contains( _Satellite ) )
				return;

			// Backup selection
			SatelliteBase	PreviousSelection = SelectedSatellite;

			// Simulate Unity steps
			_Satellite.OnDisable();
			_Satellite.OnDestroy();

			// Remove from the appropriate list
			if ( _Satellite is SatellitePlanetaryBody )
				m_SatellitesPlanet.Remove( _Satellite as SatellitePlanetaryBody );
			else if ( _Satellite is SatelliteStar )
				m_SatellitesStar.Remove( _Satellite as SatelliteStar );
			else if ( _Satellite is SatelliteBackground )
				m_SatellitesBackground.Remove( _Satellite as SatelliteBackground );
			ListsNeedUpdate();	// So the lists are rebuilt

			// Restore selection
			SelectedSatellite = PreviousSelection;
			if ( SelectedSatellite == null && SatellitesGeneric.Count > 0 )
				SelectedSatellite = SatellitesGeneric[0];	// Select first satellite otherwise...

			// Notify
			if ( SatellitesChanged != null )
				SatellitesChanged( this, EventArgs.Empty );
		}

		/// <summary>
		/// Finds a satellite by name
		/// </summary>
		/// <param name="_SatelliteName">The name of the satellite to look for</param>
		/// <returns></returns>
		public SatelliteBase	FindByName( string _SatelliteName )
		{
			foreach ( SatelliteBase S in SatellitesGeneric )
				if ( S.Name == _SatelliteName )
					return S;

			return null;
		}

		/// <summary>
		/// Renders the satellites to the specified target
		/// </summary>
		/// <param name="_TargetBackground">The target where to render the background</param>
		/// <param name="_TargetBackgroundEnvironment">The target where to render the background environment</param>
		public void				Render( RenderTexture _TargetBackground, RenderTexture _TargetBackgroundEnvironment )
		{
			if ( _TargetBackground == null )
				Help.LogWarning( "Passing a null target for satellites rendering..." );

 			// Render
 			ModuleSatellites.SatelliteBase[]	Satellites = SortedSatellites;

			GL.PushMatrix();

			// Render normal background
			RenderTexture.active = _TargetBackground;
 			foreach ( SatelliteBase S in Satellites )
 				S.Render();

			// Render environment background
			m_Owner.AmbientNightSky = Vector3.zero;
			RenderTexture.active = _TargetBackgroundEnvironment;
 			foreach ( SatelliteBase S in Satellites )
 				S.RenderEnvironment();

			RenderTexture.active = null;
			GL.PopMatrix();
		}

		#region Render Targets Size Update

		protected override void	InternalCreateRenderTargets()
		{
		}

		protected override void	InternalDestroyRenderTargets()
		{
		}

		#endregion

		/// <summary>
		/// This is called by the satellites when one of their properties (e.g. distance, enabled) changed and these properties have an influence on the lists
		/// </summary>
		protected void		ListsNeedUpdate()
		{
			// Clear the lists
			m_SatellitesGeneric = null;
			m_SortedSatellites = null;
		}

		#region IComparer<SatelliteBase> Members

		/// <summary>
		/// Compares 2 satellite distances for back to front sorting
		/// </summary>
		/// <param name="x"></param>
		/// <param name="y"></param>
		/// <returns></returns>
		public int Compare( ModuleSatellites.SatelliteBase x, ModuleSatellites.SatelliteBase y )
		{
			return Comparer<float>.Default.Compare( y.DistanceFromPlanetMKm, x.DistanceFromPlanetMKm );
		}

		#endregion

		#endregion
	}
}