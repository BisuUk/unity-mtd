using System;
using UnityEngine;

using Nuaj;

/// <summary>
/// This script needs to be attached to a GameObject. You can then use it to correctly locate and setup a lightning bolt.
/// Lightning bolts are defined by a segment that emits light along the path (although, at the time, only the START position
///  is used as a light source)
/// </summary>
[ExecuteInEditMode]
public class	NuajLightningBolt : MonoBehaviour
{
	#region CONSTANTS

	protected const int		POLY_LINE_NODES_COUNT = 10;
	protected const int		INTENSITY_NOISE_TABLE_SIZE = 64;

	#endregion

	#region FIELDS

	[SerializeField] protected Vector3		m_Start = Vector3.zero;					// Start point
	[SerializeField] protected Vector3		m_End = -400.0f * Vector3.up;			// End point
	[SerializeField] protected Color		m_Color = Color.white;					// Lightning color
	[SerializeField] protected float		m_Intensity = 0.0f;						// Lightning intensity per meter (to animate with time)
	[SerializeField] protected float		m_PointLightIntensityFactor = 0.05f;	// Intensity factor to use on the point light

	[SerializeField] protected float		m_GizmoCubeSize = 4.0f;

	// Internal data
	protected static float[,]	ms_IntensityNoise = null;

	// Cached data
	protected Vector3		m_ShaderColor = Vector3.zero;
	protected Vector3[]		m_PolyLine = new Vector3[POLY_LINE_NODES_COUNT];
	protected float			m_InvSqLength = 0.0f;

	protected Light			m_PointLight = null;

	// Lightning strike simulation
	protected float			m_TimeFromStrike = 0.0f;
	protected float			m_StrikeDuration = 0.0f;
	protected Vector2		m_StrikeNoisePosition = Vector2.zero;
	protected Vector2		m_StrikeVariation = Vector2.zero;
	protected float			m_StrikeK0, m_StrikeK1;

	#endregion

	#region PROPERTIES

	/// <summary>
	/// Gets or sets the lightning's start position
	/// </summary>
	public Vector3		P0
	{
		get { return m_Start; }
		set
		{
			if ( Help.Approximately( value, m_Start ) )
				return;

			m_Start = value;
			UpdateCachedValues();
		}
	}

	/// <summary>
	/// Gets or sets the lightning's end position
	/// </summary>
	public Vector3		P1
	{
		get { return m_End; }
		set
		{
			if ( Help.Approximately( value, m_End ) )
				return;
			m_End = value;
			UpdateCachedValues();
		}
	}

	/// <summary>
	/// Gets or sets the lightning's color
	/// </summary>
	public Color		Color
	{
		get { return m_Color; }
		set
		{
			if ( Help.Approximately( value, m_Color ) )
				return;
			m_Color = value;
			UpdateCachedValues();
		}
	}

	/// <summary>
	/// Gets or sets the lightning's intensity
	/// </summary>
	public float		Intensity
	{
		get { return m_Intensity; }
		set
		{
			if ( Mathf.Approximately( value, m_Intensity ) )
				return;

			m_Intensity = value;
			UpdateCachedValues();
		}
	}

	/// <summary>
	/// Gets or sets the intensity factor for the point light
	/// </summary>
	public float		PointLightIntensityFactor
	{
		get { return m_PointLightIntensityFactor; }
		set
		{
			if ( Mathf.Approximately( value, m_PointLightIntensityFactor ) )
				return;

			m_PointLightIntensityFactor = value;
			UpdateCachedValues();
		}
	}

	/// <summary>
	/// Gets the color to use by the shader (simply Color * Intensity)
	/// </summary>
	public Vector3		ShaderColor	{ get { return m_ShaderColor; } }

	/// <summary>
	/// Gets the inverse of the lightning bolt's square length (in world units)
	/// </summary>
	public float		InvSqLength	{ get { return m_InvSqLength; } }

	/// <summary>
	/// Gets or sets the GUI gizmo's cube size
	/// </summary>
	public float		GizmoCubeSize
	{
		get { return m_GizmoCubeSize; }
		set { m_GizmoCubeSize = value; }
	}

	protected static float[,]	IntensityNoise
	{
		get
		{
			if ( ms_IntensityNoise != null )
				return ms_IntensityNoise;

			// Build the noise...
			ms_IntensityNoise = new float[INTENSITY_NOISE_TABLE_SIZE,INTENSITY_NOISE_TABLE_SIZE];
			for ( int Y=0; Y < INTENSITY_NOISE_TABLE_SIZE; Y++ )
				for ( int X=0; X < INTENSITY_NOISE_TABLE_SIZE; X++ )
					ms_IntensityNoise[X,Y] = UnityEngine.Random.value;

			return ms_IntensityNoise;
		}
	}

	/// <summary>
	/// Gets the optional child point light
	/// </summary>
	protected Light		PointLight
	{
		get
		{
			if ( m_PointLight != null )
				return m_PointLight;

			if ( transform.childCount > 0 )
				m_PointLight = transform.GetChild( 0 ).GetComponent<Light>();

			return m_PointLight;
		}
	}

	#endregion

	#region METHODS

	void		OnEnable()
	{
		UpdateCachedValues();

		if ( PointLight != null )
			PointLight.enabled = true;
	}

	void		OnDisable()
	{
		if ( PointLight != null )
			PointLight.enabled = false;
	}

	void		OnDrawGizmos()
	{
		Gizmos.matrix = transform.localToWorldMatrix;
		Gizmos.color = UnityEngine.Color.yellow;

		for ( int i=0; i < POLY_LINE_NODES_COUNT-1; i++ )
			Gizmos.DrawLine( m_PolyLine[i], m_PolyLine[i+1] );
		Gizmos.DrawCube( m_Start, m_GizmoCubeSize * Vector3.one );
		Gizmos.DrawCube( m_End, m_GizmoCubeSize * Vector3.one );
 
		Help.DrawIcon( transform.localToWorldMatrix.MultiplyPoint( m_Start ), "Lightning Icon" );
	}

	/// <summary>
	/// Computes the color coming from a lightning bolt and arriving at the specified surface point
	/// </summary>
	/// <param name="_Position">The position to compute lighting at</param>
	/// <param name="_Normal">The surface normal at target position</param>
	/// <param name="_WorldUnit2Kilometer">The factor to transform world units into kilometers</param>
	/// <returns>The HDR color of lighting.</returns>
	/// <remarks> You need to apply luminance adaptation and tone mapping to that color to use it with Unity LDR rendering (cf. NuajManager.ToneMap)</remarks>
	public Vector3	ComputeLightningColor( Vector3 _Position, Vector3 _Normal, float _WorldUnit2Kilometer )
	{
		#region Computation Details
		// We need to compute lighting from a light segment as seen from a point of view :
		//
		//        V
		//   P0 *===>=======* P1
		//      |          /
		//      |         /
		//      |        /
		//      |       /
		//      |      /
		//      | ^N  /
		//      | .  /
		//      | . /
		//      |. /
		//      |./
		//      |/
		//      * P
		//
		// We pose :
		//	Dx = ||P1 - P0||
		//	V = (P1 - P0) / Dx  the unit vector from P0 to P1
		//
		// We use the following model for each point along the path (P0,P1) :
		//
		//	        (P0-P + V.x).N		<= Simple Lambert dot product (unfortunately, it doesn't account for backfacing)
		//	l(x) = --------------
		//	        (P0-P + V.x)^3		<= power 3 because we need the normalized (P0+V.x) and also because light intensity decreases with the square of the distance
		//
		// Integrating along the path from P0 to P1 yields :
		//
		//	         2b.(2c + d.x) - 2a.(d + 2x)
		//	L(x) = --------------------------------
		//	       (d^2-4c) sqrt( c + x.(d + x) )
		//
		// With :
		//	D = P0 - P
		//	a = D.N
		//	b = V.N
		//	c = D.D
		//	d = 2.D.V
		//
		// To account for backfacing, we should find the intersection of the lighting bolt segment with the surface plane
		//	and only integrate within that clipped segment but I'm quite lazy so I'll leave that as an exercise... ^^
		//
		#endregion

		float	ScaleFactor = 1000.0f * _WorldUnit2Kilometer;

		Vector3	D = ScaleFactor * (m_Start - _Position);
		if ( Vector3.Dot( D, _Normal ) < 0.0f && Vector3.Dot( m_End - _Position, _Normal ) < 0.0f )
			return Vector3.zero;	// Quick backfacing reject (ideally we should compute the intersection of the bolt with the surface plane and only integrate within the clipped segment)

		Vector3	V = ScaleFactor * (m_End - m_Start);
		float	Dx = V.magnitude;
				V /= Dx;
		float	a = Vector3.Dot( D, _Normal );
		float	b = Vector3.Dot( V, _Normal );
		float	c = Dx * Dx;
		float	d = 2.0f * Vector3.Dot( D, V );

		float	L0	= (4.0f * b * c - 2.0f * a * d)
					/ ((d*d-4.0f*c) * Dx);
		float	L1	= (2.0f * b * (2.0f * c + d * Dx) - 2.0f * a * (d + 2.0f * Dx))
					/ ((d*d-4.0f*c) * Mathf.Sqrt( c + Dx * (d + Dx) ));

		float	IntensityFactor = 1.0f / D.magnitude;

		return IntensityFactor * m_ShaderColor * (L1 - L0);
	}

	/// <summary>
	/// Starts a lightning bolt strike
	/// </summary>
	/// <param name="_Intensity">The maximum intensity peak</param>
	/// <param name="_Duration">The duration of the strike in seconds</param>
	/// <param name="_VariationSpeed">The speed at which the intensity variates (e.g. 10 means 10 variations per second)</param>
	public void		StartStrike( float _Intensity, float _Duration, float _VariationSpeed )
	{
		m_TimeFromStrike = 0.0f;			// Restart strike time
		m_StrikeDuration = _Duration;
		m_StrikeNoisePosition = new Vector2( UnityEngine.Random.value * INTENSITY_NOISE_TABLE_SIZE, UnityEngine.Random.value * INTENSITY_NOISE_TABLE_SIZE );

		// Build the variation vector
		float	VariationDirectionAngle = 2.0f * UnityEngine.Random.value * Mathf.PI;
		m_StrikeVariation = _VariationSpeed * new Vector2( Mathf.Cos( VariationDirectionAngle ), Mathf.Sin( VariationDirectionAngle ) );

		// Build the strike constants
		m_StrikeK1 = -Mathf.Log( 0.1f / (m_StrikeDuration * _Intensity) ) / m_StrikeDuration;
		m_StrikeK0 = m_StrikeK1 * _Intensity * 2.7182818284590452353602874713527f;
	}

	/// <summary>
	/// To be called each frame for lightning strike update
	/// </summary>
	public void		UpdateStrike()
	{
		if ( m_TimeFromStrike > 4.0f * m_StrikeDuration )
			return;

		float	Dt = NuajTime.DeltaTime;

		m_TimeFromStrike += Dt;

		if ( m_TimeFromStrike >= 4.0f * m_StrikeDuration )
		{	// Clear intensity...
			Intensity = 0.0f;
			return;
		}

		m_StrikeNoisePosition += Dt * m_StrikeVariation;	// March in noise

		// Compute noisy intensity variation
		// Indeed, the rapid variation in intensity is driven by a 2D noise texture in which we're travelling
		//	during the strike.
		// The length of the StrikeVariation vector gives the speed of the variation, its original random
		//	orientation ensures no two lightning strikes are the same...
		//
		int		X0 = Mathf.FloorToInt( m_StrikeNoisePosition.x );
		float	x = m_StrikeNoisePosition.x - X0;
		X0 = X0 & (INTENSITY_NOISE_TABLE_SIZE-1);
		int		X1 = (X0+1) & (INTENSITY_NOISE_TABLE_SIZE-1);
		int		Y0 = Mathf.FloorToInt( m_StrikeNoisePosition.y );
		float	y = m_StrikeNoisePosition.y - Y0;
		Y0 = Y0 & (INTENSITY_NOISE_TABLE_SIZE-1);
		int		Y1 = (Y0+1) & (INTENSITY_NOISE_TABLE_SIZE-1);

		float[,]	NoiseTable = IntensityNoise;
		float	N00 = NoiseTable[X0,Y0];
		float	N01 = NoiseTable[X1,Y0];
		float	N10 = NoiseTable[X0,Y1];
		float	N11 = NoiseTable[X1,Y1];

		float	N0 = (1.0f-x) * N00 + x * N01;
		float	N1 = (1.0f-x) * N10 + x * N11;
		float	IntensityVariation = (1.0f-y) * N0 + y * N1;

		// Compute intensity enveloppe that modulates the intensity variation :
		// The enveloppe is shaped by a rapidly decreasing exponential
		float	IntensityEnveloppe = m_StrikeK0 * m_TimeFromStrike * Mathf.Exp( -m_StrikeK1 * m_TimeFromStrike );

		Intensity = IntensityEnveloppe * IntensityVariation;
	}

	protected void	UpdateCachedValues()
	{
		// Update cached variables
		m_ShaderColor = m_Intensity * Help.ColorToVec3( m_Color );
		m_InvSqLength = 1.0f / Math.Max( 1e-3f, (m_End - m_Start).magnitude );
		m_InvSqLength *= m_InvSqLength;

		// Also update our child point light if it exists...
		if ( PointLight != null )
		{
			m_PointLight.transform.localPosition = m_Start;	// Set the light at our start position...
			PointLight.intensity = 10.0f;
			PointLight.color = m_PointLightIntensityFactor * m_Intensity * m_Color;
		}

		if ( !Application.isEditor || Application.isPlaying )
			return;

		// Update cute polyline
		int		i = 0;
		m_PolyLine[i++] = m_Start;

		Vector3	P = m_Start;
		Vector3	V = m_End - m_Start;
		float	MaxOffset = 0.1f * V.magnitude;
				V /= (POLY_LINE_NODES_COUNT-1);
		for ( ; i < POLY_LINE_NODES_COUNT-1; i++ )
		{
			P += V;
			Vector3	Offset = MaxOffset * new Vector3( 2.0f * UnityEngine.Random.value - 1.0f, 2.0f * UnityEngine.Random.value - 1.0f, 2.0f * UnityEngine.Random.value );
			m_PolyLine[i] = P + Offset;
		}
		m_PolyLine[i] = m_End;
	}

	#endregion
}
