//#define USE_FIXED_RENDERTARGETS	// Define this to create fixed render targets and not use temporary ones...

using System;
using UnityEngine;
using System.Collections;

namespace Nuaj
{
	/// <summary>
	/// The ImageScaler class is used to retrieve the average luminace of an image
	///  so this luminance is later used in the tone mapping stage to adapt
	///  an HDR image into a LDR result useable by Unity
	/// It also performs upscaling of downscaled scattering buffers. These buffers
	///  are POINT sampled so multiple samples need to be taken to obtain a nice
	///  bilinear look
	/// </summary>
	public class	ImageScaler
	{
		#region FIELDS

		protected NuajMaterial		m_Material = null;
		protected NuajMaterial		m_MaterialLog = null;
		protected int				m_Width = 0;
		protected int				m_Height = 0;
		protected int				m_MipLevelsCount = 0;
		protected float				m_AverageOrMax = 1.0f;

#if USE_FIXED_RENDERTARGETS
		protected RenderTexture[]	m_MipMaps = null;
#endif

		#endregion

		#region PROPERTIES

#if USE_FIXED_RENDERTARGETS
		public RenderTexture[]		MipMaps			{ get { return m_MipMaps; } }
#endif

		/// <summary>
		/// Gets or sets the Average->Max value interpolant.
		/// The tone mapping algorithm computes the AVERAGE and MAXIMUM scene luminance.
		/// This factor tells which one to use (0=fully average, 1=fully maximum)
		/// </summary>
		public float				AverageOrMax	{ get { return m_AverageOrMax; } set { m_AverageOrMax = Mathf.Clamp01( value ); } }

		/// <summary>
		/// Gets the width of the image processed by the scaler
		/// </summary>
		public int					Width			{ get { return m_Width; } }
		/// <summary>
		/// Gets the height of the image processed by the scaler
		/// </summary>
		public int					Height			{ get { return m_Height; } }

		#endregion

		#region METHODS

		/// <summary>
		/// Creates an instance of the tone mapper to apply to images of the specified size
		/// </summary>
		public	ImageScaler()
		{
		}

		#region Control

		public void		OnEnable()
		{
			m_Material = Help.CreateMaterial( "Utility/ImageScaler" );
			m_MaterialLog = Help.CreateMaterial( "Utility/ImageScalerLog" );
		}

		public void		OnDisable()
		{
			Help.SafeDestroyNuaj( ref m_Material );
			Help.SafeDestroyNuaj( ref m_MaterialLog );
		}
		
		/// <summary>
		/// Creates the necessary targets for downsampling
		/// </summary>
		/// <param name="_Width"></param>
		/// <param name="_Height"></param>
		public void		CreateRenderTargets( int _Width, int _Height )
		{
			if ( _Width == m_Width && _Height == m_Height )
				return;	// No change...

			DestroyRenderTargets();

			m_Width = _Width;
			m_Height = _Height;

			// Initialize the mip-map chain
			int	MaxSize = Math.Max( m_Width, m_Height );
			m_MipLevelsCount = (int) Mathf.Floor( Mathf.Log( MaxSize ) / Mathf.Log( 2.0f ) );
#if USE_FIXED_RENDERTARGETS
			m_MipMaps = new RenderTexture[m_MipLevelsCount];

			int	CurrentWidth = m_Width;
			int	CurrentHeight = m_Height;
			for ( int MipIndex=0; MipIndex < m_MipLevelsCount; MipIndex++ )
			{
				CurrentWidth = Math.Max( 2, CurrentWidth + 1 >> 1 );
				CurrentHeight = Math.Max( 2, CurrentHeight + 1 >> 1 );
				m_MipMaps[MipIndex] = Help.CreateRT( "ToneMappingMipLevel" + MipIndex, CurrentWidth, CurrentHeight, RenderTextureFormat.ARGBHalf, FilterMode.Point, TextureWrapMode.Clamp );
			}
#endif
		}

		/// <summary>
		/// Destroys existing render targets
		/// </summary>
		public void		DestroyRenderTargets()
		{
#if USE_FIXED_RENDERTARGETS
			if ( m_MipMaps != null )
				for ( int MipIndex=0; MipIndex < m_MipMaps.Length; MipIndex++ )
					Help.SafeDestroy( ref m_MipMaps[MipIndex] );
			m_MipMaps = null;
#endif
			m_Width = m_Height = 0;
		}

		#endregion

		/// <summary>
		/// Computes the luminance of the provided image by downscaling to a 1x1 target
		/// </summary>
		/// <param name="_SceneTexture">The source image containing the unaffected scene rendering to compute the luminance from</param>
		/// <param name="_ScatteringTexture">The source image containing the scene's scattering and extinction to alter the source scene with</param>
		/// <param name="_SceneDirectionalLuminanceMultiplier">The factor to apply to scene's directional light color for LDR->HDR conversion</param>
		/// <param name="_SceneAmbientLuminanceLDR">The scene's LDR ambient light color</param>
		/// <param name="_SceneAmbientLuminanceHDR">The scene's HDR ambient light color</param>
		/// <param name="_bSceneIsHDR">True if the source scene was rendered in LDR</param>
		/// <returns>The global luminance of the image</returns>
		public float	ComputeImageLuminance( NuajManager _Caller, RenderTexture _SceneTexture, RenderTexture _ScatteringTexture, float _SceneDirectionalLuminanceMultiplier, float _SceneAmbientLuminanceLDR, float _SceneAmbientLuminanceHDR, bool _bSceneIsHDR )
		{
			if ( m_Material == null )//|| m_MipMaps == null )
			{	// Damn it !
				Help.LogError( "Image Downscale Luminance DISABLED ! => Recreate render targets..." );
				return 1.0f;
			}

			// Downscale
			m_Material.SetFloat( "_LerpAvgMax", m_AverageOrMax );
			m_Material.SetTexture( "_TexScattering", _ScatteringTexture );
			m_Material.SetFloat( "_SceneDirectionalLuminanceFactor", _SceneDirectionalLuminanceMultiplier );
			m_Material.SetFloat( "_SceneAmbientLuminanceLDR", _SceneAmbientLuminanceLDR );
			m_Material.SetFloat( "_SceneAmbientLuminanceLDR2HDR", _SceneAmbientLuminanceHDR / Math.Max( 1e-3f, _SceneAmbientLuminanceLDR ) );

			RenderTexture	SourceTexture = _SceneTexture;
			int		MaterialPassIndex = _bSceneIsHDR ? 1 : 0;

#if USE_FIXED_RENDERTARGETS
			Vector3	dUV = Vector3.zero;
			for ( int PassIndex=0; PassIndex < m_MipMaps.Length; PassIndex++ )
			{
				// Setup the delta UV to reach for
				dUV.x = 1.0f / SourceTexture.width;
				dUV.y = 1.0f / SourceTexture.height;
				m_Material.SetVector( "_dUV", dUV );

				// Downscale
				m_Material.Blit( SourceTexture, m_MipMaps[PassIndex], MaterialPassIndex );
//Help.LogDebug( "ToneMapping Pass #" + PassIndex + " SourceSize=" + SourceTexture.width + "x" + SourceTexture.height + " TargetSize=" + m_MipMaps[PassIndex].width + "x" + m_MipMaps[PassIndex].height + " dUV=" + dUV );

				// Next level
				SourceTexture = m_MipMaps[PassIndex];
				MaterialPassIndex = 2;
			}

			// Last blit from 2x2 to 1x1
			_Caller.RenderToCPU( SourceTexture, 0, m_Material, 3 );
#else
			int	CurrentWidth = m_Width;
			int	CurrentHeight = m_Height;
			RenderTexture	TargetTexture = null;
			Vector3	dUV = Vector3.zero;
			for ( int PassIndex=0; PassIndex < m_MipLevelsCount; PassIndex++ )
			{
				// Setup the delta UV to reach for
				dUV.x = 1.0f / SourceTexture.width;
				dUV.y = 1.0f / SourceTexture.height;
				m_Material.SetVector( "_dUV", dUV );

				// Create target mip map
				CurrentWidth = Math.Max( 2, CurrentWidth + 1 >> 1 );
				CurrentHeight = Math.Max( 2, CurrentHeight + 1 >> 1 );
				TargetTexture = Help.CreateTempRT( CurrentWidth, CurrentHeight, RenderTextureFormat.ARGBHalf, FilterMode.Point, TextureWrapMode.Clamp );

				// Downscale
				m_Material.Blit( SourceTexture, TargetTexture, MaterialPassIndex );

				// Next level
				if ( SourceTexture != null && SourceTexture != _SceneTexture )
					Help.ReleaseTemporary( SourceTexture );
				SourceTexture = TargetTexture;
				MaterialPassIndex = 2;
			}

			// Last blit from 2x2 to 1x1
			_Caller.RenderToCPU( SourceTexture, 0, m_Material, 3 );

			Help.ReleaseTemporary( SourceTexture );
#endif

 			// HDR result is packed in a RGBA32 color
			Color	PackedResult = _Caller.CPUReadBack( 0 );
			float	Result = PackedResult.b * 65535.0f + PackedResult.g * 255.0f + PackedResult.r;

			return Math.Max( 0.001f, Result );
		}

		/// <summary>
		/// Computes the luminance of the provided image by LOG-downscaling to a 1x1 target
		/// </summary>
		/// <param name="_SceneTexture">The source image containing the unaffected scene rendering to compute the luminance from</param>
		/// <param name="_ScatteringTexture">The source image containing the scene's scattering and extinction to alter the source scene with</param>
		/// <param name="_SceneDirectionalLuminanceMultiplier">The factor to apply to scene's directional light color for LDR->HDR conversion</param>
		/// <param name="_SceneAmbientLuminanceLDR">The scene's LDR ambient light color</param>
		/// <param name="_SceneAmbientLuminanceHDR">The scene's HDR ambient light color</param>
		/// <param name="_bSceneIsHDR">True if the source scene was rendered in LDR</param>
		/// <returns>The global luminance of the image</returns>
		public float	ComputeImageLuminanceLog( NuajManager _Caller, RenderTexture _SceneTexture, RenderTexture _ScatteringTexture, float _SceneDirectionalLuminanceMultiplier, float _SceneAmbientLuminanceLDR, float _SceneAmbientLuminanceHDR, bool _bSceneIsHDR )
		{
			if ( m_MaterialLog == null )
			{	// Damn it !
				Help.LogError( "Image Downscale Luminance DISABLED ! => Recreate render targets..." );
				return 1.0f;
			}

			// Downscale
			m_MaterialLog.SetFloat( "_LerpAvgMax", m_AverageOrMax );
			m_MaterialLog.SetTexture( "_TexScattering", _ScatteringTexture );
			m_MaterialLog.SetFloat( "_SceneDirectionalLuminanceFactor", _SceneDirectionalLuminanceMultiplier );
			m_MaterialLog.SetFloat( "_SceneAmbientLuminanceLDR", _SceneAmbientLuminanceLDR );
			m_MaterialLog.SetFloat( "_SceneAmbientLuminanceLDR2HDR", _SceneAmbientLuminanceHDR / Math.Max( 1e-3f, _SceneAmbientLuminanceLDR ) );

			RenderTexture	SourceTexture = _SceneTexture;
			int		MaterialPassIndex = _bSceneIsHDR ? 1 : 0;

#if USE_FIXED_RENDERTARGETS
			Vector3	dUV = Vector3.zero;
			for ( int PassIndex=0; PassIndex < m_MipMaps.Length; PassIndex++ )
			{
				// Setup the delta UV to reach for
				dUV.x = 1.0f / SourceTexture.width;
				dUV.y = 1.0f / SourceTexture.height;
				m_MaterialLog.SetVector( "_dUV", dUV );

				// Downscale
				m_MaterialLog.Blit( SourceTexture, m_MipMaps[PassIndex], MaterialPassIndex );
//Help.LogDebug( "ToneMapping Pass #" + PassIndex + " SourceSize=" + SourceTexture.width + "x" + SourceTexture.height + " TargetSize=" + m_MipMaps[PassIndex].width + "x" + m_MipMaps[PassIndex].height + " dUV=" + dUV );

				// Next level
				SourceTexture = m_MipMaps[PassIndex];
				MaterialPassIndex = 2;
			}

			// Last blit from 2x2 to 1x1
			_Caller.RenderToCPU( SourceTexture, 0, m_Material, 3 );
#else
			int	CurrentWidth = m_Width;
			int	CurrentHeight = m_Height;
			RenderTexture	TargetTexture = null;
			Vector3	dUV = Vector3.zero;
			for ( int PassIndex=0; PassIndex < m_MipLevelsCount; PassIndex++ )
			{
				// Setup the delta UV to reach for
				dUV.x = 1.0f / SourceTexture.width;
				dUV.y = 1.0f / SourceTexture.height;
				m_Material.SetVector( "_dUV", dUV );

				// Create target mip map
				CurrentWidth = Math.Max( 2, CurrentWidth + 1 >> 1 );
				CurrentHeight = Math.Max( 2, CurrentHeight + 1 >> 1 );
				TargetTexture = Help.CreateTempRT( CurrentWidth, CurrentHeight, RenderTextureFormat.ARGBHalf, FilterMode.Point, TextureWrapMode.Clamp );

				// Downscale
				m_Material.Blit( SourceTexture, TargetTexture, MaterialPassIndex );

				// Next level
				if ( SourceTexture != null && SourceTexture != _SceneTexture )
					Help.ReleaseTemporary( SourceTexture );
				SourceTexture = TargetTexture;
				MaterialPassIndex = 2;
			}

			// Last blit from 2x2 to 1x1
			_Caller.RenderToCPU( SourceTexture, 0, m_Material, 3 );

			Help.ReleaseTemporary( SourceTexture );
#endif
 			// HDR result is packed in a RGBA32 color
			Color	PackedResult = _Caller.CPUReadBack( 0 );
			float	Result = PackedResult.b * 65535.0f + PackedResult.g * 255.0f + PackedResult.r;

			return Math.Max( 0.001f, Result );
		}

		#endregion
	}
}