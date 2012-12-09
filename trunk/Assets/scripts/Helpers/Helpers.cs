//#define SHADER_DEBUG	// Undefine this to use compiled runtime shaders
//#define LOG_DEBUG

using System;
using UnityEngine;
using System.Collections.Generic;

namespace Nuaj
{
	/// <summary>
	/// Various helper functions mostly used internally
	/// </summary>
	public static class	Help
	{
		#region CONSTANTS

		/// <summary>
		/// RGB => Y (taken from http://wiki.gamedev.net/index.php/D3DBook:High-Dynamic_Range_Rendering#Light_Adaptation)
		/// </summary>
		public static readonly Vector3	LUMINANCE = new Vector3( 0.2126f, 0.7152f, 0.0722f );

		#endregion

		#region NESTED TYPES

		public struct float16
		{
			public ushort	Value;

			/// <summary>
			/// Encodes a float into a float16
			/// </summary>
			/// <param name="_Value"></param>
			public	float16( float _Value )
			{
				bool	bSign = _Value < 0.0;
				int		Exponent = (int) (Mathf.Log( _Value ) * 1.4426950408889634073599246810019f );
				_Value = Math.Abs( _Value ) / (1 << Exponent) - 1.0f;
				int		Mantissa = (int) Mathf.Floor( 1024.0f * Mathf.Clamp01( _Value ) );

				Value = (ushort) ((bSign ? 0x8000 : 0x0000) | (((15 + Exponent & 0x1F) << 10)) | (Mantissa & 0x3FF));
			}
			
			public static explicit operator float16( float _Value )
			{
				return new float16( _Value );
			}

			/// <summary>
			/// Parses a float16 value into a standard float
			/// </summary>
			/// <param name="_Value">The value to parse</param>
			/// <returns>The parsed float</returns>
			public static explicit operator float( float16 _Value )
			{
				UInt16	Value = _Value.Value;

				float	fSign = (Value & 0x8000) != 0 ? -1.0f : 1.0f;
				int		Exponent = (Value & 0x7C00) >> 10;
				int		Mantissa = Value & 0x3FF;

				return	fSign * Mathf.Pow( 2.0f, Exponent - 15 ) * (1.0f + Mantissa / 1024.0f);
			}
		}

		/// <summary>
		/// This class wraps a temporary render texture
		/// </summary>
		private class	TempRenderTexturesList : IDisposable
		{
			private class	TempRenderTexture : IDisposable
			{
				private const int	FRAMES_BEFORE_GARBAGED = 4;	// The amount of frames of non-usage after which the texture is released

				public RenderTexture	m_Texture = null;

				private int				m_NotUsedForFramesCount = 0;
				private bool			m_bInUse = false;

				public bool				IsInUse	{ get { return m_bInUse; } }

				public TempRenderTexture( RenderTexture _Texture )
				{
					m_Texture = _Texture;
				}

				public void		Use()
				{
					m_bInUse = true;
					m_NotUsedForFramesCount = FRAMES_BEFORE_GARBAGED;
				}

				public void		Release()
				{
					if ( !m_bInUse )
						throw new Exception( "Releasing an unused texture !" );
					m_bInUse = false;
				}

				public bool		GarbageCollect()
				{
					m_NotUsedForFramesCount--;
//	 				if ( m_NotUsedForFramesCount <=0 )
// 						throw new Exception( "Temporary texture has not been used for a while ! Check your code for Use/Release couples !" );

 					return m_NotUsedForFramesCount <=0;
				}

				#region IDisposable Members

				public void Dispose()
				{
					if ( m_Texture != null )
						SafeDestroy( ref m_Texture );
				}

				#endregion
			}

			private List<TempRenderTexture>	m_Textures = new List<TempRenderTexture>();

			private int						m_Width = 0;
			private int						m_Height = 0;
			private RenderTextureFormat		m_Format = RenderTextureFormat.ARGBHalf;
			private TextureWrapMode			m_WrapMode = TextureWrapMode.Clamp;
			private FilterMode				m_FilterMode = FilterMode.Bilinear;
			private int						m_HashCode = 0;

			public	TempRenderTexturesList( int _Width, int _Height, RenderTextureFormat _Format, TextureWrapMode _WrapMode, FilterMode _FilterMode )
			{
				m_Width = _Width;
				m_Height = _Height;
				m_Format = _Format;
				m_WrapMode = _WrapMode;
				m_FilterMode = _FilterMode;
				m_HashCode = GetHashCode( m_Width, m_Height, m_Format, m_WrapMode, m_FilterMode );
			}

			public RenderTexture	GetTexture()
			{
				foreach ( TempRenderTexture TRT in m_Textures )
				{
					if ( !TRT.IsInUse )
					{	// Can use that one !
						TRT.Use();
						return TRT.m_Texture;
					}
				}

				// Create a brand new one !
				RenderTexture	Result = Help.CreateRT( "Temp" + m_Width + "x" + m_Height + "[" + m_Textures.Count + "]", m_Width, m_Height, m_Format, m_FilterMode, m_WrapMode );

				// Store it in the list
				TempRenderTexture	NewTRT = new TempRenderTexture( Result );
				m_Textures.Add( NewTRT );
				NewTRT.Use();

				return Result;
			}

			public void		Release( RenderTexture _Texture )
			{
				foreach ( TempRenderTexture TRT in m_Textures )
					if ( TRT.m_Texture == _Texture )
					{	// Found it !
						TRT.Release();
						return;
					}

				throw new Exception( "Asked to release an unknown texture !" );
			}
			
			public delegate void 	TextureCollectedEventHandler( RenderTexture _CollectedTexture );
			public void	GarbageCollect( TextureCollectedEventHandler _CollectionEvent )
			{
				foreach ( TempRenderTexture TRT in m_Textures )
					if ( TRT.GarbageCollect() )
					{
						_CollectionEvent( TRT.m_Texture );

						TRT.Dispose();
						m_Textures.Remove( TRT );
						return;	// We'll collect any other later...
					}
			}

			public override int GetHashCode()
			{
				return m_HashCode;//m_Texture != null ? GetHashCode( m_Texture.width, m_Texture.height, m_Texture.format, m_Texture.wrapMode, m_Texture.filterMode ) : 0;
			}

			public static int	GetHashCode( int _Width, int _Height, RenderTextureFormat _Format, TextureWrapMode _WrapMode, FilterMode _FilterMode )
			{
				int	SizeCode = _Width * _Height;	// MAX OF 2048x2048 !!!

				int	FormatCode = _Format == RenderTextureFormat.ARGBHalf ? 0 : 1;
					FormatCode <<= 22;

				int	WrapModeCode = _WrapMode == TextureWrapMode.Clamp ? 0 : 1;
					WrapModeCode <<= 23;

				int	FilterModeCode = _FilterMode == FilterMode.Point ? 0 : (_FilterMode == FilterMode.Bilinear ? 1 : 2);
					FilterModeCode <<= 24;

				return SizeCode | FormatCode | WrapModeCode | FilterModeCode;
			}

			#region IDisposable Members

			public void Dispose()
			{
				foreach ( TempRenderTexture TRT in m_Textures )
					TRT.Dispose();
				m_Textures.Clear();
			}

			#endregion
		}

		#endregion

		#region FIELDS

		private static Dictionary<int,TempRenderTexturesList>			ms_TextureID2Texture = new Dictionary<int,TempRenderTexturesList>();
		private static Dictionary<RenderTexture,TempRenderTexturesList>	ms_Texture2WrappedTexture = new Dictionary<RenderTexture,TempRenderTexturesList>();

		#endregion

		#region METHODS

		internal static void			SafeDestroy<T>( ref T _Object ) where T:UnityEngine.Object
		{
			NuajManager.SafeDestroy( ref _Object );
		}

		internal static void			SafeDestroyNuaj<T>( ref T _Object ) where T:class,IDisposable
		{
			NuajManager.SafeDestroyNuaj( ref _Object );
		}

		#region Textures & Render Targets

		/// <summary>
		/// Creates a simple texture
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Width"></param>
		/// <param name="_Height"></param>
		/// <param name="_Format"></param>
		/// <param name="_MipMaps">Create mip maps for the texture</param>
		/// <param name="_FilterMode">Filter mode to use to sample the texture</param>
		/// <param name="_WrapMode">Wrap mode to use to address the texture</param>
		/// <returns></returns>
		internal static NuajTexture2D	CreateTexture( string _Name, int _Width, int _Height, TextureFormat _Format, bool _MipMaps, FilterMode _FilterMode, TextureWrapMode _WrapMode )
		{
			return new NuajTexture2D( _Name, _Width, _Height, _Format, _MipMaps, _FilterMode, _WrapMode );
		}

		/// <summary>
		/// Creates a simple render target
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Width"></param>
		/// <param name="_Height"></param>
		/// <param name="_Format"></param>
		/// <param name="_FilterMode"></param>
		/// <param name="_WrapMode"></param>
		/// <returns></returns>
		internal static RenderTexture	CreateRT( string _Name, int _Width, int _Height, RenderTextureFormat _Format, FilterMode _FilterMode, TextureWrapMode _WrapMode )
		{
			return CreateRT( _Name, _Width, _Height, _Format, _FilterMode, _WrapMode, false );
		}

		/// <summary>
		/// Creates a simple render target
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Width"></param>
		/// <param name="_Height"></param>
		/// <param name="_Format"></param>
		/// <param name="_FilterMode"></param>
		/// <param name="_WrapMode"></param>
		/// <param name="_buseMipMaps"></param>
		/// <returns></returns>
		internal static RenderTexture	CreateRT( string _Name, int _Width, int _Height, RenderTextureFormat _Format, FilterMode _FilterMode, TextureWrapMode _WrapMode, bool _buseMipMaps )
		{
			LogDebug( "Nuaj.Help.CreateRT() \"" + _Name + "\" => " + _Width + "x" + _Height + "x" + _Format );
			if ( _Width < 1 || _Height < 1 )
				throw new Exception( "Nuaj.Help.CreateRT() => Invalid resolution !" );

			RenderTexture	Result = new RenderTexture( _Width, _Height, 0, _Format );
			Result.name = _Name;
			Result.filterMode = _FilterMode;
			Result.wrapMode = _WrapMode;
			Result.hideFlags = HideFlags.HideAndDontSave;
			Result.useMipMap = _buseMipMaps;

			return Result;
		}

		//////////////////////////////////////////////////////////////////////////
		// Temporary Textures Management
		//
		// You may find odd I had to rewrite Unity's RenderTexture.GetTemporary() but I found out that there is a bug in the returned temporary textures !
		// Indeed, they don't handle very well the change of filter mode !
		//
		// For example, if you query a temp texture of 400x300 in POINT sampling then later query another texture of the same resolution in BILINEAR sampling,
		//	the second texture will still use POINT sampling... It doesn't matter if you force the sampling to bilinear manually after the query, it doesn't change.
		// This is of course very problematic, so I simply rewrote a cache of "temporary textures" of my own, that don't return the same textures if their filter
		//	modes differ.
		//
		//////////////////////////////////////////////////////////////////////////


		/// <summary>
		/// Creates a temporary render target
		/// </summary>
		/// <param name="_Width"></param>
		/// <param name="_Height"></param>
		/// <param name="_Format"></param>
		/// <param name="_FilterMode"></param>
		/// <param name="_WrapMode"></param>
		/// <returns></returns>
		internal static RenderTexture	CreateTempRT( int _Width, int _Height, RenderTextureFormat _Format, FilterMode _FilterMode, TextureWrapMode _WrapMode )
		{
			if ( _Width < 1 || _Height < 1 )
				throw new Exception( "Nuaj.Help.CreateTempRT() => Invalid resolution !" );
			if ( _Format != RenderTextureFormat.ARGB32 && _Format != RenderTextureFormat.ARGBHalf )
				throw new Exception( "Nuaj.Help.CreateTempRT() => Only ARGB32 and ARGBHalf formats are supported !" );

			int	TextureHash = TempRenderTexturesList.GetHashCode( _Width, _Height, _Format, _WrapMode, _FilterMode );

			TempRenderTexturesList	TRTL = null;
			if ( ms_TextureID2Texture.ContainsKey( TextureHash ) )
				TRTL = ms_TextureID2Texture[TextureHash];
			else
			{
				TRTL = new TempRenderTexturesList( _Width, _Height, _Format, _WrapMode, _FilterMode );
				ms_TextureID2Texture.Add( TextureHash, TRTL );
			}

			RenderTexture	RT = TRTL.GetTexture();
			ms_Texture2WrappedTexture[RT] = TRTL;

			return RT;
		}

		/// <summary>
		/// Releases a temporary texture
		/// </summary>
		/// <param name="_Texture"></param>
		internal static void			ReleaseTemporary( RenderTexture _Texture )
		{
			if ( _Texture == null )
				return;
			
			try
			{
				ms_Texture2WrappedTexture[_Texture].Release( _Texture );
			}
			catch ( Exception _e )
			{
				throw _e;
			}
		}

		/// <summary>
		/// Clears the dictionary of temporary textures
		/// </summary>
		internal static void			DestroyTemporaryTextures()
		{
			foreach ( TempRenderTexturesList TRT in ms_TextureID2Texture.Values )
				TRT.Dispose();
			ms_TextureID2Texture.Clear();
			ms_Texture2WrappedTexture.Clear();
		}

		/// <summary>
		/// Browse all textures and destroys the ones that have not been used for some time
		/// </summary>
		internal static void			GarbageCollectUnusedTemporaryTextures()
		{
			foreach ( TempRenderTexturesList TRT in ms_TextureID2Texture.Values )
				TRT.GarbageCollect( ( RenderTexture _CollectedTexture ) =>
				    {
						ms_Texture2WrappedTexture.Remove( _CollectedTexture );
					} );
		}

		/// <summary>
		/// Creates a simple depth stencil target
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Width"></param>
		/// <param name="_Height"></param>
		/// <param name="_DepthBitsCount"></param>
		/// <returns></returns>
		internal static RenderTexture	CreateDepthStencil( string _Name, int _Width, int _Height, int _DepthBitsCount )
		{
			LogDebug( "Nuaj.Help.CreateDepthStencil() \"" + _Name + "\" => " + _Width + "x" + _Height + "x" + _DepthBitsCount );
			if ( _Width < 1 || _Height < 1 )
				throw new Exception( "Nuaj.Help.CreateDepthStencil() => Invalid resolution !" );

			RenderTexture	Result = new RenderTexture( _Width, _Height, _DepthBitsCount, RenderTextureFormat.Depth );
			Result.name = _Name;
			Result.hideFlags = HideFlags.HideAndDontSave;

			return Result;
		}

		/// <summary>
		/// Loads a texture resource
		/// </summary>
		/// <param name="_ResourceName"></param>
		/// <returns></returns>
		public static Texture2D		LoadTextureResource( string _ResourceName )
		{
			return Resources.Load( "Textures/" + _ResourceName ) as Texture2D;
		}

		/// <summary>
		/// Loads a cube map resource
		/// </summary>
		/// <param name="_ResourceName"></param>
		/// <returns></returns>
		public static Cubemap		LoadCubeMapResource( string _ResourceName )
		{
			return Resources.Load( "Textures/" + _ResourceName ) as Cubemap;
		}

		#endregion

		#region Materials

		/// <summary>
		/// Creates a material given the name of the shader
		/// Verifies the shader is supported and throw various exceptions if any problem arises
		/// In a module, you should catch exceptions and disable it in case of errors...
		/// </summary>
		/// <param name="_ShaderResourceName"></param>
		/// <returns></returns>
		internal static NuajMaterial	CreateMaterial( string _ShaderResourceName )
		{
			return new NuajMaterial( _ShaderResourceName );
		}

		/// <summary>
		/// Loads a shader resource
		/// </summary>
		/// <param name="_ShaderResourceName"></param>
		/// <returns></returns>
		internal static Shader	LoadShader( string _ShaderResourceName )
		{
#if SHADER_DEBUG
			LogDebug( "Loading Shader \"" + _ShaderResourceName + "\"..." );
			return Resources.Load( "Shaders/" + _ShaderResourceName ) as Shader;
#else
			string	OriginalName = _ShaderResourceName;
			string	ShaderName = _ShaderResourceName;
			int	DirectoryIndex = _ShaderResourceName.LastIndexOf( '/' );
			if ( DirectoryIndex != -1 )
				ShaderName = _ShaderResourceName.Remove( 0, DirectoryIndex+1 );
			_ShaderResourceName = "Shaders_Release/" + ShaderName;

			LogDebug( "Loading Shader \"" + _ShaderResourceName + "\" (Original = " + OriginalName + ")..." );

			return Resources.Load( _ShaderResourceName ) as Shader;
#endif
		}

		#endregion

		#region Math

		/// <summary>
		/// Adds W to a Vec3 and creates a Vec4
		/// </summary>
		/// <param name="_XYZ"></param>
		/// <param name="_W"></param>
		/// <returns></returns>
		public static Vector4	Vec3ToVec4( Vector3 _XYZ, float _W )
		{
			return new Vector4( _XYZ.x, _XYZ.y, _XYZ.z, _W );
		}

		/// <summary>
		/// Converts a Vec3 to a RGBA color
		/// </summary>
		/// <param name="_Color"></param>
		/// <returns></returns>
		public static Color		Vec3ToColor( Vector3 _Color )
		{
			return new Color( _Color.x, _Color.y, _Color.z, 1.0f );
		}

		/// <summary>
		/// Converts a Vec3 to a Light color and intensity
		/// </summary>
		/// <param name="_Color"></param>
		/// <param name="_Light"></param>
		public static void		Vec3ToLight( Vector3 _Color, Light _Light )
		{
//			float	Intensity = Mathf.Max( 1e-3f, Vector3.Dot( _Color, LUMINANCE ) );	// This gives bad desaturated colors
			float	Intensity = Math.Max( 1e-3f, Math.Max( Math.Max( _Color.x, _Color.y ), _Color.z ) );
			_Light.intensity = Intensity;
			_Light.color = Vec3ToColor( _Color / Intensity );
		}

		/// <summary>
		/// Converts a Color to a Vec3, ignoring alpha
		/// </summary>
		/// <param name="_Color"></param>
		/// <returns></returns>
		public static Vector3	ColorToVec3( Color _Color )
		{
			return new Vector3( _Color.r, _Color.g, _Color.b );
		}

		/// <summary>
		/// Since I didn't find a Vec3 * Vec3 operator...
		/// </summary>
		/// <param name="a"></param>
		/// <param name="b"></param>
		/// <returns></returns>
		public static Vector3	Vec3Product( Vector3 a, Vector3 b )
		{
			return new Vector3( a.x * b.x, a.y * b.y, a.z * b.z );
		}

		/// <summary>
		/// Unity's Math.SmoothStep() is completely counter-intuitive...
		/// </summary>
		/// <param name="_Min"></param>
		/// <param name="_Max"></param>
		/// <param name="t"></param>
		/// <returns></returns>
		public static float		SmoothStep( float _Min, float _Max, float t )
		{
			t = Mathf.Clamp01( (t - _Min) / (_Max - _Min) );
			return t * t * (3.0f - 2.0f * t); 
		}

		/// <summary>
		/// Computes the linear step of t in [Min,Max]
		/// </summary>
		/// <param name="_Min"></param>
		/// <param name="_Max"></param>
		/// <param name="t"></param>
		/// <returns></returns>
		public static float		LinearStep( float _Min, float _Max, float t )
		{
			return Mathf.Clamp01( (t - _Min) / (_Max - _Min) );
		}

		public static bool		Approximately( Vector2 a, Vector2 b )
		{
			return Mathf.Approximately( a.x, b.x ) && Mathf.Approximately( a.y, b.y );
		}

		public static bool		Approximately( Vector3 a, Vector3 b )
		{
			return Mathf.Approximately( a.x, b.x ) && Mathf.Approximately( a.y, b.y ) && Mathf.Approximately( a.z, b.z );
		}

		public static bool		Approximately( Vector4 a, Vector4 b )
		{
			return Mathf.Approximately( a.x, b.x ) && Mathf.Approximately( a.y, b.y ) && Mathf.Approximately( a.z, b.z ) && Mathf.Approximately( a.w, b.w );
		}

		/// <summary>
		/// Computes the intersection of a ray with a sphere
		/// </summary>
		/// <param name="_Position"></param>
		/// <param name="_Direction"></param>
		/// <param name="_SphereCenter"></param>
		/// <param name="_SphereRadius"></param>
		/// <param name="_Distance0"></param>
		/// <param name="_Distance1"></param>
		/// <returns></returns>
		public static bool	ComputeSphereIntersection( ref Vector3 _Position, ref Vector3 _Direction, ref Vector3 _SphereCenter, float _SphereRadius, out float _Distance0, out float _Distance1 )
		{
			_Distance0 = _Distance1 = 0.0f;

			Vector3	DC = _Position - _SphereCenter;	// Center => Position
			double	a = Vector3.Dot( _Direction, _Direction );
			double	b = Vector3.Dot( _Direction, DC );
			double	c = Vector3.Dot( DC, DC ) - _SphereRadius*_SphereRadius;
			double	Delta = b*b - a*c;
			if ( Delta < 0.0f )
				return false;

			Delta = Math.Sqrt( Delta );

			a = 1.0 / a;
			_Distance0 = (float) ((-b - Delta) * a);
			_Distance1 = (float) ((-b + Delta) * a);

			return true;
		}

		/// <summary>
		/// Computes only the forward intersection of a ray with a sphere, returns no intersection even if there is one but it's standing behind origin
		/// </summary>
		/// <param name="_Position"></param>
		/// <param name="_Direction"></param>
		/// <param name="_SphereCenter"></param>
		/// <param name="_SphereRadius"></param>
		/// <param name="_Distance"></param>
		/// <returns></returns>
		public static bool	ComputeForwardSphereIntersection( ref Vector3 _Position, ref Vector3 _Direction, ref Vector3 _SphereCenter, float _SphereRadius, out float _Distance )
		{
			return ComputeForwardSphereIntersection( ref _Position, ref _Direction, ref _SphereCenter, _SphereRadius, out _Distance, 0.0f );
		}
		/// <summary>
		/// Computes only the forward intersection of a ray with a sphere, returns no intersection even if there is one but it's standing behind origin
		/// </summary>
		/// <param name="_Position"></param>
		/// <param name="_Direction"></param>
		/// <param name="_SphereCenter"></param>
		/// <param name="_SphereRadius"></param>
		/// <param name="_Distance"></param>
		/// <param name="_Epsilon"></param>
		/// <returns></returns>
		public static bool	ComputeForwardSphereIntersection( ref Vector3 _Position, ref Vector3 _Direction, ref Vector3 _SphereCenter, float _SphereRadius, out float _Distance, float _Epsilon )
		{
			_Distance = -1.0f;

			float	t0, t1;
			if ( !ComputeSphereIntersection( ref _Position, ref _Direction, ref _SphereCenter, _SphereRadius, out t0, out t1 ) )
				return false;	// No intersection anyway !

			if ( t1 < _Epsilon )
				return false;	// Both intersections stand behind us...
			
			if ( t0 < 0.0f )
				_Distance = t1;
			else
				_Distance = t0;

			return true;
		}

		/// <summary>
		/// Reprojects a point on the atmosphere by casting it in the Sun's direction
		/// If the Sun is on the same side as the point then the point stays here,
		///  otherwise it traverses the atmosphere until it hits again
		/// </summary>
		/// <param name="_Position"></param>
		/// <param name="_Direction"></param>
		/// <param name="_SphereCenter"></param>
		/// <param name="_SphereRadius"></param>
		/// <param name="_Distance"></param>
		/// <returns></returns>
		public static void	ReprojectToSunHemisphere( ref Vector3 _Position, ref Vector3 _Direction, ref Vector3 _SphereCenter, float _SphereRadius, out float _Distance )
		{
 			_Distance = -1.0f;

			float	t0, t1;
			if ( !ComputeSphereIntersection( ref _Position, ref _Direction, ref _SphereCenter, _SphereRadius, out t0, out t1 ) )
			{
				//throw new Exception( "We should have an intersection here !" );
				_Distance = 0.0f;	// Tant pis...
				return;
			}

			_Distance = Math.Abs( t0 ) < Math.Abs( t1 ) ? t0 : t1;
		}

		/// <summary>
		/// Computes the vector tangent to the sphere given two directions, one of them pointing above the horizon, the other one pointing below
		/// </summary>
		/// <param name="_Position"></param>
		/// <param name="_Direction0">Direction pointing ABOVE the horizon</param>
		/// <param name="_Direction1">Directin pointing BELOW the horizon</param>
		/// <param name="_SphereCenter"></param>
		/// <param name="_SphereRadius"></param>
		/// <param name="_Tangent"></param>
		/// <returns></returns>
		public static bool	ComputeTangentVector( ref Vector3 _Position, ref Vector3 _Direction0, ref Vector3 _Direction1, ref Vector3 _SphereCenter, float _SphereRadius, out Vector3 _Tangent )
		{
			_Tangent = Vector3.zero;

			Vector3	V = _Direction0;
			Vector3	DeltaV = _Direction1 - V;
			Vector3	D = _Position - _SphereCenter;
			double	H = Vector3.Dot(D,D) - _SphereRadius*_SphereRadius;

			double	VD = Vector3.Dot( V, D );
			double	dVD = Vector3.Dot( DeltaV, D );
			double	c = VD*VD - H * Vector3.Dot( V, V );
			double	b = VD*dVD - H * Vector3.Dot( V, DeltaV );
			double	a = dVD*dVD - H * Vector3.Dot( DeltaV, DeltaV );

			double	Delta = b*b - a*c;
			if ( Delta < 0.0 )
				return false;

			Delta = Math.Sqrt( Delta );
			a = 1.0 / a;

			double	t0 = (-b-Delta) * a;
			double	t1 = (-b+Delta) * a;

			float	t = -1.0f;
			if ( t0 >= 0.0f && t0 <= 1.0f )
				t = (float) t0;
			if ( t1 >= 0.0f && t1 <= 1.0f )
				t = (float) t1;
			
			if ( t < 0.0f )
				return false;	// No intersection in [0,1]

			_Tangent = V + t * DeltaV;

			return true;
		}

		#endregion

		#region Colorimetry

		/// <summary>
		/// Converts a RGB color to YUV (code from http://www.fourcc.org/fccyvrgb.php)
		/// NOTE: UV are in [0,1] !
		/// </summary>
		/// <param name="_RGB"></param>
		/// <returns></returns>
		public static Vector3	RGB2YUV( Vector3 _RGB )
		{
			Vector3	YUV;
					YUV.x = 0.299f * _RGB.x + 0.587f * _RGB.y + 0.114f * _RGB.z;
					YUV.y = Mathf.Clamp01( 0.5f + 0.565f * (_RGB.z-YUV.x) );
					YUV.z = Mathf.Clamp01( 0.5f + 0.713f * (_RGB.x-YUV.x) );
			return YUV;

		}

		/// <summary>
		/// Converts a YUV color to RGB
		/// NOTE: UV must be in [0,1]
		/// </summary>
		/// <param name="_YUV"></param>
		/// <returns></returns>
		public static Vector3	YUV2RGB( Vector3 _YUV )
		{
			_YUV.y -= 0.5f;
			_YUV.z -= 0.5f;
			Vector3	RGB;
					RGB.x = _YUV.x + 1.403f * _YUV.z;
					RGB.y = _YUV.x - 0.344f * _YUV.y - 0.714f * _YUV.z;
					RGB.z = _YUV.x + 1.770f * _YUV.y;
			return RGB;
		}

		/// <summary>
		/// RGB -> XYZ conversion 
		/// http://www.w3.org/Graphics/Color/sRGB 
		/// </summary>
		/// <param name="_RGB"></param>
		/// <returns></returns>
		public static Vector3	RGB2xyY( Vector3 _RGB )
		{
			// The official sRGB to XYZ conversion matrix is (following ITU-R BT.709)
			Vector3[] RGB2XYZ = new Vector3[] {
						new Vector3( 0.5141364f, 0.3238786f, 0.16036376f ),
						new Vector3( 0.265068f, 0.67023428f, 0.06409157f ),
						new Vector3( 0.0241188f, 0.1228178f, 0.84442666f ) };

			Vector3 XYZ = new Vector3(
				Vector3.Dot( RGB2XYZ[0], _RGB ),
				Vector3.Dot( RGB2XYZ[1], _RGB ),
				Vector3.Dot( RGB2XYZ[2], _RGB ) ); 

			// XYZ -> Yxy conversion
			Vector3	xyY;
					xyY.z = XYZ.y;
 
			// x = X / (X + Y + Z) 
			// y = X / (X + Y + Z)
			float	InvSum = 1.0f / Math.Max( 1e-6f, XYZ.x + XYZ.y + XYZ.z );
			xyY.x = XYZ.x * InvSum; 
			xyY.y = XYZ.y * InvSum;

			return xyY;
		}

		/// <summary>
		/// XYZ -> RGB conversion 
		/// </summary>
		/// <param name="_xyY"></param>
		/// <returns></returns>
		public static Vector3	xyY2RGB( Vector3 _xyY )
		{
			// The official XYZ to sRGB conversion matrix is (following ITU-R BT.709) 
			Vector3[] XYZ2RGB = new Vector3[] {
					new Vector3( 2.565109f, -1.166501f, -0.398599f ),
					new Vector3( -1.021667f, 1.97767f, 0.04391905f ),
					new Vector3( 0.07533106f, -0.2543246f, 1.189233f ) };

			// xyY -> XYZ conversion
			float	InvY = 1.0f / Math.Max( 1e-6f, _xyY.y );
			Vector3	XYZ;
					XYZ.y = _xyY.z;
					XYZ.x = _xyY.x * _xyY.z * InvY;						// X = x * Y / y
					XYZ.z = (1.0f - _xyY.x - _xyY.y) * _xyY.z * InvY;	// Z = (1-x-y) * Y / y

			// RGB conversion
			return new Vector3(
				Math.Max( 0.0f, Vector3.Dot( XYZ2RGB[0], XYZ ) ),
				Math.Max( 0.0f, Vector3.Dot( XYZ2RGB[1], XYZ ) ),
				Math.Max( 0.0f, Vector3.Dot( XYZ2RGB[2], XYZ ) ) );
		}

		/// <summary>
		/// Packs a xyY color into 2 float16
		/// </summary>
		/// <param name="_xyY"></param>
		/// <param name="_xy"></param>
		/// <param name="_Y"></param>
		public static void		PackxyY( Vector3 _xyY, out float16 _xy, out float16 _Y )
		{
			_Y = (float16) _xyY.z;

			int		x = (int) Math.Floor( _xyY.x * 255.0f );
			int		y = (int) Math.Floor( _xyY.y * 255.0f );
			_xy.Value = (ushort) ((x << 8) | y);
		}

		/// <summary>
		/// UnPacks a xyY color from 2 float16
		/// </summary>
		/// <param name="_xy"></param>
		/// <param name="_Y"></param>
		/// <returns></returns>
		public static Vector3		UnPackxyY( float16 _xy, float16 _Y )
		{
			float	x = (_xy.Value >> 8) / 255.0f;
			float	y = (_xy.Value & 0xFF) / 255.0f;
			return new Vector3( x,y , (float) _Y );
		}

		#endregion

		#region Logging

		internal static void	Log( object message )
		{
			Debug.Log( message );
		}
		internal static void	LogWarning( object message )
		{
			Debug.LogWarning( message );
		}
		internal static void	LogError( object message )
		{
			Debug.LogError( message );
		}

		internal static void	LogDebug( string message )
		{
#if LOG_DEBUG	// Disable this log when not in debug mode
			if ( !Application.isPlaying )
				Debug.Log( message );
#endif
		}
		internal static void	LogDebugSeparate( string _Header )
		{
			LogDebug( _Header + "==================================== " + DateTime.Now.ToString( "HH:mm:ss" ) + " ====================================" );
		}
		internal static void	LogDebugWarning( string message )
		{
#if LOG_DEBUG	// Disable this log when not in debug mode
			if ( !Application.isPlaying )
				Debug.LogWarning( message );
#endif
		}

		internal static string	PrintVector( Vector2 _Vector )
		{
			return _Vector.x + ", " + _Vector.y;
		}

		internal static string	PrintVector( Vector3 _Vector )
		{
			return _Vector.x + ", " + _Vector.y + ", " + _Vector.z;
		}

		internal static string	PrintVector( Vector4 _Vector )
		{
			return _Vector.x + ", " + _Vector.y + ", " + _Vector.z + ", " + _Vector.w;
		}

		internal static void	DebugShowObjectFields( object o )
		{
			System.Reflection.FieldInfo[]	Fields = o.GetType().GetFields( System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance );
			LogDebug( "Object \"" + o + "\" has " + Fields.Length + " public fields :" );
			foreach ( System.Reflection.FieldInfo Field in Fields )
				LogDebug( "Field \"" + Field.Name + "\" = " + Field.GetValue( o ) );

			System.Reflection.PropertyInfo[]	Props = o.GetType().GetProperties( System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance );
			LogDebug( "Object \"" + o + "\" has " + Props.Length + " public properties :" );
			foreach ( System.Reflection.PropertyInfo Prop in Props )
				LogDebug( "Property \"" + Prop.Name + "\" = " + Prop.GetValue( o, new object[] {} ) );
		}

		#endregion

		#region Gizmos

		/// <summary>
		/// Replaces the Gizmos.DrawIcon() so we can use a resource that is not specifically in the Assets/Gizmos folder (this is quite an annoying constraint when shipping a package)
		/// </summary>
		/// <param name="_Position"></param>
		/// <param name="_ResourceName"></param>
		internal static void	DrawIcon( Vector3 _Position, string _ResourceName )
		{
			if ( Camera.current == null )
				return;

			Texture2D	T = Resources.Load( "Gizmos/" + _ResourceName ) as Texture2D;
			if ( T == null )
				return;

			Matrix4x4	M = Camera.current.cameraToWorldMatrix;
			Vector3		ToPoint = _Position - (Vector3) M.GetColumn( 3 );
						M.SetColumn( 3, Help.Vec3ToVec4( _Position, 1.0f ) );
			float		Scale = T.height * ToPoint.magnitude * Mathf.Tan( 0.5f * Mathf.Deg2Rad * Camera.current.fov ) / Screen.height;

			DrawTexture( T, M, Scale, false );
		}

		/// <summary>
		/// Draws a texture in the XY plane given by the provided transform and scaled by the given scale factor
		/// </summary>
		/// <param name="_Texture"></param>
		/// <param name="_Transform"></param>
		/// <param name="_Scale"></param>
		/// <param name="_PlaneXZ">Use plane XZ, otherwise XY</param>
		internal static void	DrawTexture( Texture2D _Texture, Matrix4x4 _Transform, float _Scale, bool _PlaneXZ )
		{
			if ( _Texture == null )
				return;
			if ( !CreateMaterial() )
				return;

			if ( Camera.current == null )
				return;

			m_Material.SetTexture( "_MainTex", _Texture );
			m_Material.SetPass( 0 );

			GL.PushMatrix();
			GL.modelview = Camera.current.worldToCameraMatrix * _Transform;

			GL.Begin( GL.QUADS );
			if ( _PlaneXZ )
			{
				GL.TexCoord2( 0.0f, 0.0f );		GL.Vertex3( -_Scale, 0.0f, -_Scale );
				GL.TexCoord2( 1.0f, 0.0f );		GL.Vertex3( +_Scale, 0.0f, -_Scale );
				GL.TexCoord2( 1.0f, 1.0f );		GL.Vertex3( +_Scale, 0.0f, +_Scale );
				GL.TexCoord2( 0.0f, 1.0f );		GL.Vertex3( -_Scale, 0.0f, +_Scale );
			}
			else
			{
				GL.TexCoord2( 0.0f, 0.0f );		GL.Vertex3( -_Scale, -_Scale, 0.0f );
				GL.TexCoord2( 1.0f, 0.0f );		GL.Vertex3( +_Scale, -_Scale, 0.0f );
				GL.TexCoord2( 1.0f, 1.0f );		GL.Vertex3( +_Scale, +_Scale, 0.0f );
				GL.TexCoord2( 0.0f, 1.0f );		GL.Vertex3( -_Scale, +_Scale, 0.0f );
			}
			GL.End();

			GL.PopMatrix();
		}

		private static Material		m_Material = null;

		private static bool	CreateMaterial()
		{
			if ( m_Material != null )
				return	true;	// Already created...

			try
			{
				m_Material = new Material(
							"Shader \"Lines/Colored Blended\" {\n" +
							"	Properties\n" +
							"	{\n" +
							"		_MainTex( \"Texture\", 2D ) = \"white\" {}\n" +
							"		_Color( \"Main Color\", Color ) = (1,1,1,1)\n" +
							"	}\n" +
							"	SubShader\n" +
							"	{\n" +
							"		Pass { " +
 							"			Blend Off AlphaTest Greater 0.5 ZWrite Off ZTest Less Cull Off Fog { Mode Off } Lighting Off\n" +
							"			SetTexture [_MainTex]\n" +
							"			{\n" +
							"				constantColor [_Color]\n" +
							"				combine texture * constant, texture * constant\n" +
							"			}\n" +
							"	} }\n" +
							"}"
						);

				// Failed at compilation...
				if ( !m_Material.shader.isSupported )
					throw new Exception( "Shader has errors or is not supported on this machine !" );

				m_Material.hideFlags = HideFlags.HideAndDontSave;
				m_Material.shader.hideFlags = HideFlags.HideAndDontSave;
			}
			catch ( Exception _e )
			{	// Failed !
				Help.LogError( "Failed to compile NuajMapLocator material : " + _e.Message );
				m_Material = null;
				return false;
			}

			return true;
		}

		#endregion

		#endregion
	}
}