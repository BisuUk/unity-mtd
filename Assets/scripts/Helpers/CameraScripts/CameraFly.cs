using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// This little example class handles camera fly controls as well as the demo mode shown on http://www.nuaj.net
/// It shows how to hook to the NuajManager and NuajOrchestrator for external drive and also manages the lightning
///  bolt strikes intervals.
/// 
/// USAGE: Drop it on your camera, press PLAY, enjoy the demo
/// </summary>
public class CameraFly : MonoBehaviour
{
	protected const float		DEMO_SPEED = 2.0f;
	protected const float		ROTATION_SENSITIVITY = 0.4f;		// In radians/second
	protected const float		TRANSLATION_SENSITIVITY = 200.0f;	// In meters/second

	protected bool				m_bDemoMode = true;
	protected System.DateTime	m_TimeFromLastClick = System.DateTime.Now;

	// Manipulation data
	protected bool				m_ButtonDown = false;
	protected Vector3			m_ButtonDownMousePosition;
	protected Vector2			m_DeltaPosition = Vector2.zero;


	protected NuajManager		m_Manager = null;
	protected NuajManager		Manager
	{
		get
		{
			if ( m_Manager != null )
				return m_Manager;

			m_Manager = FindObjectOfType( typeof(NuajManager) ) as NuajManager;
			return m_Manager;
		}
	}

	protected NuajOrchestrator	m_Orch = null;
	protected NuajOrchestrator	Orch
	{
		get
		{
			if ( m_Orch != null )
				return m_Orch;

			m_Orch = FindObjectOfType( typeof(NuajOrchestrator) ) as NuajOrchestrator;
			return m_Orch;
		}
	}

	protected NuajGameControls	m_GameControls = null;
	protected NuajGameControls	GameControls
	{
		get
		{
			if ( m_GameControls != null )
				return m_GameControls;

			m_GameControls = GetComponent<NuajGameControls>();
			return m_GameControls;
		}
	}


	void	Start()
	{
		Vector3	At = transform.localToWorldMatrix.GetColumn( 2 );
		float	Phi = Mathf.Rad2Deg * Mathf.Atan2( At.x, At.z );
		float	Theta = Mathf.Rad2Deg * Mathf.Asin( -At.y );

		m_DeltaPosition.x = Phi;
		m_DeltaPosition.y = Theta;
	}

	void	Update()
	{
		bool	ButtonDown = Input.GetMouseButton( 0 );
		if ( GameControls != null && GameControls.IsUsingGUI )
			ButtonDown = false;	// Don't use mouse if already being used for GUI

		System.DateTime	Now = System.DateTime.Now;
		if ( ButtonDown || Input.GetMouseButton( 1 ) || Input.GetMouseButton( 2 ) )
		{	// Exit demo mode
			m_bDemoMode = false;
			m_TimeFromLastClick = Now;
			Start();
		}
		if ( (Now - m_TimeFromLastClick).TotalSeconds > 20 )
			m_bDemoMode = true;	// Enter demo mode if no click for more than 20 seconds

		if ( Input.GetKeyDown( KeyCode.Return ) )
		{	// Restart demo mode
// Uncomment this block to restart the demo all over again (I prefer it better when it simply continues from last position though...)
// 			if ( m_DemoPath != null )
// 				m_DemoPath.Reset();
// 			m_DemoPath = null;
// 			m_DemoTime = 0.0f;
			m_bDemoMode = true;
		}

		if ( m_bDemoMode )
		{	// Play demo mode...
			Demo();
			return;
		}

		if ( !m_ButtonDown && ButtonDown )
		{	// Press
			m_ButtonDownMousePosition = Input.mousePosition;
		}
		else if ( m_ButtonDown && !ButtonDown )
		{	// Release

		}
		m_ButtonDown = ButtonDown;

		// Rotate
		if ( m_ButtonDown )
		{
 			m_DeltaPosition.x += ROTATION_SENSITIVITY * (Input.mousePosition.x - m_ButtonDownMousePosition.x) * Time.deltaTime;
			m_DeltaPosition.y += ROTATION_SENSITIVITY * (m_ButtonDownMousePosition.y - Input.mousePosition.y) * Time.deltaTime;
 			transform.rotation = Quaternion.AngleAxis( m_DeltaPosition.x, Vector3.up ) * Quaternion.AngleAxis( m_DeltaPosition.y, Vector3.right );
		}

		// Translate
		Vector3	Translation = Vector3.zero;
		if ( Input.GetKey( KeyCode.UpArrow ) )
			Translation += Vector3.forward;
		if ( Input.GetKey( KeyCode.DownArrow ) )
			Translation -= Vector3.forward;
		if ( Input.GetKey( KeyCode.LeftArrow ) )
			Translation -= Vector3.right;
		if ( Input.GetKey( KeyCode.RightArrow ) )
			Translation += Vector3.right;
		if ( Input.GetKey( KeyCode.Space ) )
			Translation += Vector3.up;

		transform.Translate( TRANSLATION_SENSITIVITY * Time.deltaTime * Translation, Space.Self );
		
		
		// Handle lightning in manual mode too !
		UpdateLightning();
		
// Key dropper that populates an array of keys on middle button click...
// if ( Input.GetMouseButtonDown( 2 ) && Manager != null )
// {
// 	Matrix4x4	M = Manager.Camera.transform.localToWorldMatrix;
// 	Vector3		Pos = M.GetColumn( 3 );
// 	Vector3		Rot = M.GetColumn( 2 );
// 	m_PositionKeys.Add( Pos );
// 	m_RotationKeys.Add( Rot );
// 	Debug.LogWarning( "Camera P = " + Nuaj.Help.PrintVector( Pos ) + " At = " + Nuaj.Help.PrintVector( Rot ) );
// 
// 	string	FormatPos = "";
// 	string	FormatRot = "";
// 	for ( int KeyIndex=0; KeyIndex < m_PositionKeys.Count; KeyIndex++ )
// 	{
// 		FormatPos += ", new Vector3( " + m_PositionKeys[KeyIndex].x + "f, " + m_PositionKeys[KeyIndex].y + "f, " + m_PositionKeys[KeyIndex].z + "f )";
// 		FormatRot += ", new Vector3( " + m_RotationKeys[KeyIndex].x + "f, " + m_RotationKeys[KeyIndex].y + "f, " + m_RotationKeys[KeyIndex].z + "f )";
// 	}
// 
// 	bool	bClearList = false;
// 	if ( bClearList )
// 	{
// 		m_PositionKeys.Clear();
// 		m_RotationKeys.Clear();
// 	}
// }
	}

protected List<Vector3>		m_PositionKeys = new List<Vector3>();
protected List<Vector3>		m_RotationKeys = new List<Vector3>();

	#region Demo Mode

	protected int			m_DemoPathIndex = -1;
	protected float			m_DemoTime = 0.0f;
	protected DemoPath		m_DemoPath = null;

	/// <summary>
	/// The demo path class is a set of parameters that are interpolated across a given time duration
	/// </summary>
	protected class		DemoPath
	{
		public Vector3[]		PositionKeys = null;
		public Vector3[]		RotationKeys = null;
		public float			Duration = 0.0f;

		public NuajOrchestrator.WEATHER_PRESETS	PresetSource = NuajOrchestrator.WEATHER_PRESETS.CLEAR;
		public NuajOrchestrator.WEATHER_PRESETS	PresetTarget = NuajOrchestrator.WEATHER_PRESETS.CLOUDY;
		public float			PresetBalanceStart = 0.0f;
		public float			PresetBalanceEnd = 0.0f;

		public float			TimeOfDayStart = 12.0f;
		public float			TimeOfDayEnd = 12.0f;
		public float			NightDensityFactor = 2.0f;

		public float			Wind = 0.0f;
		public float			WindAngle = 0.0f;

		// Interpolation cached data
		protected bool			m_bPathPreProcessed = false;
		protected float[]		m_IntervalDurations = null;
		protected float[]		m_KeyTimes = null;
		protected int			m_KeyIndex = 0;

		public void		Apply( NuajManager _Manager, NuajOrchestrator _Orch, float _Time )
		{
			// Apply orchestrator preset
			_Orch.WeatherTypeSource = PresetSource;
			_Orch.WeatherTypeTarget = PresetTarget;
			_Orch.WeatherBalance = PresetBalanceStart + (PresetBalanceEnd - PresetBalanceStart) * _Time / Duration;

			_Orch.TimeOfDay = TimeOfDayStart + (TimeOfDayEnd - TimeOfDayStart) * _Time / Duration;
			_Orch.DensityMultiplierAtNight = NightDensityFactor;

			_Orch.WindForce = Wind;
			_Orch.WindDirectionAngle = WindAngle;

			// Compute spline position
			if ( !m_bPathPreProcessed )
				PreProcessPath();

			if ( m_KeyIndex > PositionKeys.Length-2 )
				return;	// Can't interpolate...

			while ( _Time > m_KeyTimes[m_KeyIndex+1] )
			{
				m_KeyIndex++;
				if ( m_KeyIndex >= m_IntervalDurations.Length )
					return;	// End of path...
			}

			// Interpolate position/view vectors
			float	t = (_Time - m_KeyTimes[m_KeyIndex]) / m_IntervalDurations[m_KeyIndex];	// Normalize time
			Vector3	Position = LerpPosition( ref PositionKeys[m_KeyIndex], ref PositionKeys[m_KeyIndex+1], t );
			Vector3	View = LerpView( ref RotationKeys[m_KeyIndex], ref RotationKeys[m_KeyIndex+1], t );

			// Recompute view matrix
 			Transform	T = _Manager.Camera.transform;

			Vector3	Right = Vector3.Cross( Vector3.up, View ).normalized;
			Vector3	Up = Vector3.Cross( View, Right );

			T.right = Right;
			T.up = Up;
			T.forward = View;
			T.position = Position;
		}

		public Vector3	LerpPosition( ref Vector3 p0, ref Vector3 p1, float t )
		{
			return Vector3.Lerp( p0, p1, t );
		}

		public Vector3	LerpView( ref Vector3 p0, ref Vector3 p1, float t )
		{
			Vector3	Ortho = Vector3.Cross( p0, p1 ).normalized;
			Vector3	Ortho2 = Vector3.Cross( Ortho, p0 ).normalized;
			float	Alpha = Mathf.Atan2( Vector3.Dot( p1, Ortho2 ), Vector3.Dot( p1, p0 ) ) * t;
			return	Mathf.Cos( Alpha ) * p0.normalized + Mathf.Sin( Alpha ) * Ortho2;
		}

		public void		Reset()
		{
			m_KeyIndex = 0;
		}

		/// <summary>
		/// Pre-processes the array of keys to slice the path into intervals of appropriate durations based on key distances and angular rotations
		/// </summary>
		protected void	PreProcessPath()
		{
			// Slice the keys by distance
			float[]	KeyDistances = new float[PositionKeys.Length-1];
			float	SumDistances = 0.0f;
			for ( int KeyIndex=0; KeyIndex < PositionKeys.Length-1; KeyIndex++ )
			{
				KeyDistances[KeyIndex] = (PositionKeys[KeyIndex+1] - PositionKeys[KeyIndex]).magnitude;
				SumDistances += KeyDistances[KeyIndex];
			}

			// Compute the time between each couple of keys
			m_IntervalDurations = new float[KeyDistances.Length];
			m_KeyTimes = new float[PositionKeys.Length];
			float	KeySumTimes = 0.0f;
			for ( int KeyIndex=0; KeyIndex < PositionKeys.Length-1; KeyIndex++ )
			{
				float	IntervalDuration = Duration * KeyDistances[KeyIndex] / Mathf.Max( 1e-3f, SumDistances );
				if ( IntervalDuration < 1e-3f )
					IntervalDuration = Duration / (PositionKeys.Length-1);	// Special case when not moving...

				m_IntervalDurations[KeyIndex] = IntervalDuration;
				m_KeyTimes[KeyIndex] = KeySumTimes;

				KeySumTimes += IntervalDuration;
			}
			m_KeyTimes[PositionKeys.Length-1] = KeySumTimes;

			m_KeyIndex = 0;	// Restart
			m_bPathPreProcessed = true;	// We're done !
		}
	}

	#region Demo Paths
	
	//////////////////////////////////////////////////////////////////////////
	// Moutain side, slow panoramic viewing
	protected static DemoPath	PATH0 = new DemoPath() {
		// Path
		Duration = 20.0f,
		PositionKeys = new Vector3[] { new Vector3( 957.2f, 146.6f, 659.6f ), new Vector3( 957.2f, 146.6f, 659.6f ) },
		RotationKeys = new Vector3[] { new Vector3( -0.9235016f, 0.2574321f, -0.2843826f ), new Vector3( -0.3180973f, 0.2092408f, -0.9246797f ) },
		// Weather
		PresetSource = NuajOrchestrator.WEATHER_PRESETS.CLEAR,
		PresetTarget = NuajOrchestrator.WEATHER_PRESETS.CLOUDY,
		PresetBalanceStart = 0.8f,		PresetBalanceEnd = 0.8f,
		// Time
		TimeOfDayStart = 12.0f,	TimeOfDayEnd = 12.0f,	NightDensityFactor = 2.0f,
		// Wind
		Wind = 0.05f,	WindAngle = 0.0f
	};
	
	//////////////////////////////////////////////////////////////////////////
	// Fixed altitude, reverse sunrise
	protected static DemoPath	PATH1 = new DemoPath() {
		// Path
		Duration = 20.0f,
		PositionKeys = new Vector3[] { new Vector3( 1168.495f, 178.2754f, 351.9048f ), new Vector3( 1168.495f, 178.2754f, 351.9048f ) },
		RotationKeys = new Vector3[] { new Vector3( -0.8661392f, 0.1753419f, 0.4680366f ), new Vector3( -0.9777262f, 0.116993f, 0.1742533f ) },
		// Weather
		PresetSource = NuajOrchestrator.WEATHER_PRESETS.THICK_FOG,
		PresetTarget = NuajOrchestrator.WEATHER_PRESETS.SUMMER_CLOUDS,
		PresetBalanceStart = 0.694f,	PresetBalanceEnd = 0.694f,
		// Time
		TimeOfDayStart = 12.0f,	TimeOfDayEnd = -2.0f,	NightDensityFactor = 2.4f,
		// Wind
		Wind = 0.04f,	WindAngle = 0.0f
	};
	
	//////////////////////////////////////////////////////////////////////////
	// Storm coming
	protected static DemoPath	PATH2 = new DemoPath() {
		// Path
		Duration = 5.0f,
		PositionKeys = new Vector3[] { new Vector3( 878.995f, 96.62216f, 1282.189f ), new Vector3( 878.995f, 96.62216f, 1282.189f ) },
		RotationKeys = new Vector3[] { new Vector3( -0.8883392f, 0.1859852f, -0.4198373f ), new Vector3( -0.8883392f, 0.1859852f, -0.4198373f ) },
		// Weather
		PresetSource = NuajOrchestrator.WEATHER_PRESETS.HIGH_ALTITUDE_CLOUDS,
		PresetTarget = NuajOrchestrator.WEATHER_PRESETS.STORMY,
		PresetBalanceStart = 0.0f,		PresetBalanceEnd = 1.0f,
		// Time
		TimeOfDayStart = 7.5f,	TimeOfDayEnd = 9.0f,	NightDensityFactor = 2.4f,
		// Wind
		Wind = 0.04f,	WindAngle = 0.0f
	};
	protected static DemoPath	PATH3 = new DemoPath() {
		// Path
		Duration = 5.0f,
		PositionKeys = new Vector3[] { new Vector3( 878.995f, 96.62216f, 1282.189f ), new Vector3( 878.995f, 96.62216f, 1282.189f ) },
		RotationKeys = new Vector3[] { new Vector3( -0.8883392f, 0.1859852f, -0.4198373f ), new Vector3( -0.8883392f, 0.1859852f, -0.4198373f ) },
		// Weather
		PresetSource = NuajOrchestrator.WEATHER_PRESETS.STORM,
		PresetTarget = NuajOrchestrator.WEATHER_PRESETS.STORMY,
		PresetBalanceStart = 1.0f,		PresetBalanceEnd = 0.0f,
		// Time
		TimeOfDayStart = 9.0f,	TimeOfDayEnd = 9.0f,	NightDensityFactor = 2.4f,
		// Wind
		Wind = 0.04f,	WindAngle = 0.0f
	};
	protected static DemoPath	PATH4 = new DemoPath() {
		// Path
		Duration = 5.0f,
		PositionKeys = new Vector3[] { new Vector3( 878.995f, 96.62216f, 1282.189f ), new Vector3( 878.995f, 96.62216f, 1282.189f ) },
		RotationKeys = new Vector3[] { new Vector3( -0.8883392f, 0.1859852f, -0.4198373f ), new Vector3( -0.8883392f, 0.1859852f, -0.4198373f ) },
		// Weather
		PresetSource = NuajOrchestrator.WEATHER_PRESETS.STORM,
		PresetTarget = NuajOrchestrator.WEATHER_PRESETS.STORM,
		PresetBalanceStart = 1.0f,		PresetBalanceEnd = 1.0f,
		// Time
		TimeOfDayStart = 9.0f,	TimeOfDayEnd = 9.0f,	NightDensityFactor = 2.4f,
		// Wind
		Wind = 0.04f,	WindAngle = 0.0f
	};

	//////////////////////////////////////////////////////////////////////////
	// Flight through clouds
	protected static DemoPath	PATH5 = new DemoPath() {
		// Path
		Duration = 90.0f,
		PositionKeys = new Vector3[] { new Vector3( 851.9915f, 106.4083f, 1290.85f ), new Vector3( 450.4706f, 355.8561f, 1569.622f ), new Vector3( 89.25304f, 596.2988f, 1967.554f ), new Vector3( -311.1688f, 798.2986f, 2312.084f ), new Vector3( -883.8751f, 989.9252f, 2687.426f ), new Vector3( -1664.495f, 1004.585f, 2768.183f ), new Vector3( -1829.186f, 928.9019f, 2586.283f ), new Vector3( -1916.742f, 823.7018f, 2226.905f ), new Vector3( -1840.597f, 735.9958f, 1911.541f ), new Vector3( -1507.978f, 628.0098f, 1525.88f ), new Vector3( -1147.735f, 556.5522f, 1345.711f ), new Vector3( -611.1504f, 439.0193f, 1250.715f ), new Vector3( -319.4075f, 411.7526f, 1193.518f ), new Vector3( 117.9866f, 527.9032f, 1050.955f ), new Vector3( 359.9595f, 693.079f, 950.5385f ), new Vector3( 681.1953f, 869.4586f, 831.899f ), new Vector3( 1073.18f, 902.8538f, 789.7f ), new Vector3( 1638.387f, 778.3705f, 918.4888f ), new Vector3( 2014.881f, 599.4672f, 1151.321f ), new Vector3( 2229.204f, 514.244f, 1326.628f ), new Vector3( 2621.2f, 436.5443f, 1605.551f ), new Vector3( 2924.101f, 446.767f, 1779.177f ), new Vector3( 3334.083f, 544.091f, 2006.987f ), new Vector3( 3637.332f, 606.3872f, 2189.383f ), new Vector3( 4083.56f, 569.515f, 2733.776f ), new Vector3( 4028.306f, 553.6295f, 3096.199f ), new Vector3( 3789.889f, 577.4957f, 3377.34f ), new Vector3( 3340.393f, 569.3905f, 3488.698f ), new Vector3( 2926.068f, 518.5327f, 3456.299f ), new Vector3( 2376.872f, 447.5822f, 3217.003f ), new Vector3( 2043.576f, 452.2596f, 2876.501f ), new Vector3( 1847.175f, 541.8737f, 2615.723f ), new Vector3( 1666.282f, 655.0432f, 2365.568f ), new Vector3( 1351.842f, 714.9975f, 1836.285f ), new Vector3( 1191.069f, 676.1839f, 1491.022f ), new Vector3( 1052.101f, 521.4838f, 1172.973f ), new Vector3( 941.4424f, 345.0852f, 799.6752f ), new Vector3( 1018.952f, 289.8773f, 488.2402f ), new Vector3( 1147.157f, 302.598f, 363.2008f ), new Vector3( 1320.903f, 312.9439f, 268.6545f ), new Vector3( 1455.196f, 317.2349f, 280.4976f ), new Vector3( 1541.871f, 318.9536f, 422.4051f ), new Vector3( 1532.911f, 313.3111f, 836.2439f ), new Vector3( 1425.826f, 306.209f, 1058.969f ), new Vector3( 1264.757f, 296.0871f, 1207.5f ) },	//, new Vector3( 1073.942f, 282.1502f, 1287.596f ), new Vector3( 1073.942f, 282.1502f, 1287.596f ) },
		RotationKeys = new Vector3[] { new Vector3( -0.8734113f, 0.3700534f, 0.3165648f ), new Vector3( -0.5206335f, 0.402254f, 0.7530821f ), new Vector3( -0.600978f, 0.4954475f, 0.627182f ), new Vector3( -0.7381119f, 0.2330947f, 0.6331333f ), new Vector3( -0.9288053f, 0.06312943f, 0.3651513f ), new Vector3( -0.7591439f, -0.3166513f, -0.5687113f ), new Vector3( -0.4036109f, -0.2618619f, -0.8766566f ), new Vector3( 0.0570435f, -0.2726265f, -0.9604273f ), new Vector3( 0.4777517f, -0.2348141f, -0.8465315f ), new Vector3( 0.8462909f, -0.1561018f, -0.5093368f ), new Vector3( 0.9200186f, -0.1980121f, -0.338167f ), new Vector3( 0.9743167f, -0.186709f, -0.1258847f ), new Vector3( 0.958977f, 0.06103468f, -0.2768359f ), new Vector3( 0.8079833f, 0.4869339f, -0.3317503f ), new Vector3( 0.7393717f, 0.5956551f, -0.3138866f ), new Vector3( 0.9470124f, 0.1959366f, -0.254512f ), new Vector3( 0.9930777f, -0.06419338f, 0.09836667f ), new Vector3( 0.8514415f, -0.3807573f, 0.360654f ), new Vector3( 0.7321294f, -0.3443265f, 0.5877294f ), new Vector3( 0.7496395f, -0.2439656f, 0.6152411f ), new Vector3( 0.8643138f, -0.02828352f, 0.502157f ), new Vector3( 0.8664374f, 0.1367403f, 0.4801962f ), new Vector3( 0.8473845f, 0.2618405f, 0.4619298f ), new Vector3( 0.8400259f, 0.1190852f, 0.5293158f ), new Vector3( -0.0238739f, -0.1048877f, 0.9941975f ), new Vector3( -0.3670511f, 0.06068793f, 0.928219f ), new Vector3( -0.8880968f, 0.06835148f, 0.4545461f ), new Vector3( -0.9957265f, -0.08994942f, 0.02092706f ), new Vector3( -0.9665293f, -0.1681577f, -0.1937643f ), new Vector3( -0.7964804f, -0.06663533f, -0.6009817f ), new Vector3( -0.6068925f, 0.1464153f, -0.7811813f ), new Vector3( -0.5305355f, 0.4165869f, -0.738233f ), new Vector3( -0.5667765f, 0.1571126f, -0.8087522f ), new Vector3( -0.4661652f, 0.1643479f, -0.8692985f ), new Vector3( -0.365257f, -0.409615f, -0.8359444f ), new Vector3( -0.3665617f, -0.4022779f, -0.838931f ), new Vector3( -0.05254365f, -0.3394065f, -0.9391711f ), new Vector3( 0.6494232f, 0.08053406f, -0.7561508f ), new Vector3( 0.792892f, 0.0613842f, -0.6062627f ), new Vector3( 0.9889174f, 0.03767756f, -0.1436063f ), new Vector3( 0.6721644f, 0.01778886f, 0.7401882f ), new Vector3( 0.2018058f, -0.003503202f, 0.9794193f ), new Vector3( -0.263415f, -0.0240958f, 0.9643816f ), new Vector3( -0.6603344f, -0.03560982f, 0.750127f ), new Vector3( -0.8193241f, -0.0540915f, 0.5707733f ) },	//, new Vector3( -0.9354113f, -0.0673317f, -0.3470911f ), new Vector3( -0.9354113f, -0.0673317f, -0.3470911f ) },
		// Weather
		PresetSource = NuajOrchestrator.WEATHER_PRESETS.CLEAR,
		PresetTarget = NuajOrchestrator.WEATHER_PRESETS.CLOUDY,
		PresetBalanceStart = 0.54f,		PresetBalanceEnd = 0.8f,
		// Time
		TimeOfDayStart = 5.0f,	TimeOfDayEnd = 17.5f,	NightDensityFactor = 2.4f,
		// Wind
		Wind = 0.0f,	WindAngle = 0.0f
	};
	
	//////////////////////////////////////////////////////////////////////////
	// Fixed altitude, low fog in the valley
	protected static DemoPath	PATH6 = new DemoPath() {
		// Path
		Duration = 20.0f,
//		PositionKeys = new Vector3[] { new Vector3( 916.1224f, 222.5868f, 587.4738f ), new Vector3( 916.1224f, 222.5868f, 587.4738f ) },
//		PositionKeys = new Vector3[] { new Vector3( 561.7195f, 238.6826f, 349.795f ), new Vector3( 561.7195f, 238.6826f, 349.795f ) },
		PositionKeys = new Vector3[] { new Vector3( 957.21f, 195.0f, 660.0f ), new Vector3( 957.21f, 195.0f, 660.0f ) },
//		RotationKeys = new Vector3[] { new Vector3( 0.9796833f, 0.1824766f, -0.08320393f ), new Vector3( 0.9408714f, 0.1731929f, 0.2911447f ) },
		RotationKeys = new Vector3[] { new Vector3( 0.4723114f, 0.2034232f, 0.8576368f ), new Vector3( 0.4723114f, 0.2034232f, 0.8576368f ) },
		// Weather
		PresetSource = NuajOrchestrator.WEATHER_PRESETS.VALLEY_MIST,
		PresetTarget = NuajOrchestrator.WEATHER_PRESETS.CLOUDY,
		PresetBalanceStart = 0.0f,	PresetBalanceEnd = 0.1f,
		// Time
		TimeOfDayStart = 12.0f,	TimeOfDayEnd = 18.0f,	NightDensityFactor = 4.0f,
		// Wind
		Wind = 0.1f,	WindAngle = 0.0f
	};

	protected static DemoPath	PATH7 = new DemoPath() {
		// Path
		Duration = 10.0f,
		PositionKeys = new Vector3[] { new Vector3( 957.21f, 195.0f, 660.0f ), new Vector3( 957.21f, 195.0f, 660.0f ) },
		RotationKeys = new Vector3[] { new Vector3( 0.4723114f, 0.2034232f, 0.8576368f ), new Vector3( 0.4723114f, 0.2034232f, 0.8576368f ) },
		// Weather
		PresetSource = NuajOrchestrator.WEATHER_PRESETS.VALLEY_MIST,
		PresetTarget = NuajOrchestrator.WEATHER_PRESETS.CLOUDY,
		PresetBalanceStart = 0.1f,	PresetBalanceEnd = 0.1f,
		// Time
		TimeOfDayStart = 18.0f,	TimeOfDayEnd = 19.0f,	NightDensityFactor = 4.0f,
		// Wind
		Wind = 0.1f,	WindAngle = 0.0f
	};

	#endregion

	protected DemoPath[]	m_DemoPaths = new DemoPath[]
	{
		PATH0,
		PATH1,
		PATH2, PATH3, PATH4,
		PATH5,
		PATH6, PATH7
	};

	protected void	Demo()
	{
		if ( Manager == null )
			return;
		if ( Manager.Camera == null )
			return;	// No camera ?? WTH ?
		if ( Orch == null )
			return;	// No orchestrator... Can't demo...

		// Increase demo time
		m_DemoTime += DEMO_SPEED * Nuaj.NuajTime.DeltaTime;

		// Go through next demo path if needed
		while ( m_DemoPath == null || m_DemoTime > m_DemoPath.Duration )
		{
			if ( m_DemoPath != null )
			{
				m_DemoPath.Reset();	// For next time we use it...
				m_DemoTime -= m_DemoPath.Duration;
			}
			m_DemoPathIndex = (m_DemoPathIndex+1) % m_DemoPaths.Length;
			m_DemoPath = m_DemoPaths[m_DemoPathIndex];
		}

		// Apply demo path
		m_DemoPath.Apply( Manager, m_Orch, m_DemoTime );
		
		// Simulate lightning
		UpdateLightning();
	}

	#region Lightning Bolts Animation

	/// <summary>
	/// This internal class wraps a NuajLightningBolt and handles the random strikes, durations and intervals between strikes depending on the severity of the storm
	/// </summary>
	protected class		LightningBolt
	{
		protected const float	STRIKE_INTENSITY = 100.0f;

		protected const float	DURATION_MIN = 0.4f;				// As low as 0.4s
		protected const float	DURATION_MAX = 2.0f;				// As high as 3.0s

		protected const float	VARIATION_SPEED_MIN = 2.0f;			// As low as 2 variations per second
		protected const float	VARIATION_SPEED_MAX = 15.0f;		// Up to 15 variations per second

		protected const float	DELAY_BETWEEN_STRIKES_MAX = 5.0f;	// Up to 5s when not very stormy
		protected const float	DELAY_BETWEEN_STRIKES_MIN = 1.0f;	// As low as 1s when very stormy

		protected const float	STRIKE_RANGE_MIN = 200.0f;			// Lightning can strike as near as 200m away
		protected const float	STRIKE_RANGE_MAX = 4000.0f;			// Lightning can strike as far as 4000m away

		protected const float	ANGULAR_SLICE = 120.0f;				// Strike in a 120° FOV

		protected NuajLightningBolt	m_Bolt = null;

		protected float		m_TimeBeforeNextStrike = -1.0f;

		public LightningBolt( NuajLightningBolt _Bolt )
		{
			m_Bolt = _Bolt;
		}

		public void		Update( CameraFly _Caller, float _DeltaTime, bool _bEnable, float _Importance, float _CloudAltitudeKm, float _CloudThicknessKm )
		{
			m_Bolt.enabled = _bEnable;
			if ( !_bEnable )
				return;

			// Update current strike if any
			m_Bolt.UpdateStrike();

			m_TimeBeforeNextStrike -= _DeltaTime;
			if ( m_TimeBeforeNextStrike < 0.0f )
			{	// Now striking...

				// Draw a random duration and time before another strike...
				float	StrikeDuration = Random.Range( DURATION_MIN, DURATION_MAX );
				m_TimeBeforeNextStrike = Random.Range( Mathf.Lerp( DELAY_BETWEEN_STRIKES_MAX, DELAY_BETWEEN_STRIKES_MIN, _Importance ), DELAY_BETWEEN_STRIKES_MAX );
				m_TimeBeforeNextStrike += StrikeDuration;

				// Draw a random variation speed
				float	VariationSpeed = Random.Range( VARIATION_SPEED_MIN, VARIATION_SPEED_MAX );

				// Draw a new random position somewhere about in front of the camera
				Matrix4x4	Camera2World = _Caller.Manager.Camera.camera.cameraToWorldMatrix;
				Vector3		Right = Camera2World.GetColumn( 0 );
				Vector3		At = -Camera2World.GetColumn( 2 );
				Vector3		Pos = Camera2World.GetColumn( 3 );

				float		StrikeAngle = 0.5f * Mathf.PI + 0.5f * Mathf.Deg2Rad * ANGULAR_SLICE * (2.0f * Random.value - 1.0f);
				float		StrikeDistance = Random.Range( STRIKE_RANGE_MIN, STRIKE_RANGE_MAX );
				Vector2		StrikeOffsetXZ = StrikeDistance * new Vector2( Mathf.Cos( StrikeAngle ), Mathf.Sin( StrikeAngle ) );
						
				Vector3		StrikePosition = Pos + StrikeOffsetXZ.x * Right + StrikeOffsetXZ.y * At;

				// Set bolt's altitude in the middle of the cloud layer
				Vector3		BoltPosition = m_Bolt.transform.position;
				float		BoltAltitude = (_CloudAltitudeKm + 0.5f * _CloudThicknessKm) / _Caller.Manager.WorldUnit2Kilometer;
				BoltPosition.y = BoltAltitude;
				m_Bolt.transform.position = BoltPosition;

				// Start in the clouds
				m_Bolt.P0 = new Vector3( StrikePosition.x, 0.0f, StrikePosition.z );

				// End in the ground
				m_Bolt.P1 = new Vector3( StrikePosition.x, -BoltAltitude, StrikePosition.z );

				// Strike !!!
				m_Bolt.StartStrike( STRIKE_INTENSITY, StrikeDuration, VariationSpeed );
			}
		}
	}

	protected LightningBolt[]	m_LightningBolts = null;
	protected void	UpdateLightning()
	{
		if ( Manager == null )
			return;
		if ( Orch == null )
			return;

		Nuaj.ModuleCloudVolume.CloudLayer	Cloud = m_Manager.ModuleCloudVolume.CloudLayersCount > 0 ? m_Manager.ModuleCloudVolume.CloudLayers[0] as Nuaj.ModuleCloudVolume.CloudLayer : null;
		if ( Cloud == null )
			return;

		if ( m_LightningBolts == null )
		{
			UnityEngine.Object[]	Bolts = FindObjectsOfType( typeof(NuajLightningBolt) );
			if ( Bolts == null || Bolts.Length == 0 )
				return;

			m_LightningBolts = new LightningBolt[Bolts.Length];
			for ( int BoltIndex=0; BoltIndex < Bolts.Length; BoltIndex++ )
				m_LightningBolts[BoltIndex] = new LightningBolt( Bolts[BoltIndex] as NuajLightningBolt );
		}

		// Check if we're in stormy conditions
		bool	bEnableLightning = m_Orch.WeatherTypeSource == NuajOrchestrator.WEATHER_PRESETS.STORM || m_Orch.WeatherTypeTarget == NuajOrchestrator.WEATHER_PRESETS.STORM;
		float	LightningImportance = m_Orch.WeatherTypeSource == NuajOrchestrator.WEATHER_PRESETS.STORM ? 1.0f - m_Orch.WeatherBalance : m_Orch.WeatherBalance;

		foreach ( LightningBolt Bolt in m_LightningBolts )
			Bolt.Update( this, DEMO_SPEED * Nuaj.NuajTime.DeltaTime, bEnableLightning, LightningImportance, Cloud.Altitude, Cloud.Thickness );
	}

	#endregion

	#endregion
}
