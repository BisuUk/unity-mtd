using System;
using System.Collections.Generic;
using UnityEngine;

namespace Nuaj
{
	/// <summary>
	/// This is a wrapper for Unity textures that maintain a "dirty state"
	///  so materials don't upload textures if they haven't changed...
	/// </summary>
	[Serializable]
	public class	NuajTexture2D : IDisposable
	{
		#region FIELDS

		[SerializeField] protected Texture2D	m_Texture = null;
		protected bool							m_bDirty = true;

		#endregion

		#region PROPERTIES

		/// <summary>
		/// Gets the wrapped texture
		/// </summary>
		public Texture2D		Texture
		{
			get { return m_Texture; }
			set
			{
				if ( value == m_Texture )
					return;

				m_Texture = value;
				m_bDirty = true;	// Assigning a new texture makes it dirty so it's re-uploaded to the graphics card on next usage
			}
		}

		/// <summary>
		/// Gets the dirty state
		/// The dirty state must be cleared manually once a potentially dirty texture has been uploaded to all the materials that need it
		/// </summary>
		public bool				IsDirty		{ get { return m_bDirty; } internal set { m_bDirty = value; } }

		#endregion

		#region METHODS

		/// <summary>
		/// For de-serialization purpose only, shouldn't be called !
		/// </summary>
		public NuajTexture2D()
		{
		}

		/// <summary>
		/// Creates a texture instance
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Width"></param>
		/// <param name="_Height"></param>
		/// <param name="_Format"></param>
		/// <param name="_bUseMipMaps">Create mip maps for the texture</param>
		/// <param name="_FilterMode">Filter mode to use to sample the texture</param>
		/// <param name="_WrapMode">Wrap mode to use to address the texture</param>
		/// <returns></returns>
		public NuajTexture2D( string _Name, int _Width, int _Height, TextureFormat _Format, bool _bUseMipMaps, FilterMode _FilterMode, TextureWrapMode _WrapMode )
		{
			Help.LogDebug( "Nuaj.Help.CreateTexture() \"" + _Name + "\" => " + _Width + "x" + _Height + "x" + _Format );
			if ( _Width < 1 || _Height < 1 )
				throw new Exception( "NuajTexture2D.ctor() => Invalid resolution !" );

			m_Texture = new Texture2D( _Width, _Height, _Format, _bUseMipMaps );
			m_Texture.name = _Name;
			m_Texture.filterMode = _FilterMode;
			m_Texture.wrapMode = _WrapMode;
			m_Texture.hideFlags = HideFlags.HideAndDontSave;
		}

		/// <summary>
		/// Reads the pixels from the currently active render target
		/// </summary>
		/// <param name="_Source"></param>
		/// <param name="_DestX"></param>
		/// <param name="_DestY"></param>
		/// <param name="_bRecalculateMipMaps"></param>
		public void		ReadPixels( Rect _Source, int _DestX, int _DestY, bool _bRecalculateMipMaps )
		{
			m_Texture.ReadPixels( _Source, _DestX, _DestY, _bRecalculateMipMaps );
			m_bDirty = true;
		}

		/// <summary>
		/// Unity.Texture Proxy Method
		/// </summary>
		/// <param name="x"></param>
		/// <param name="y"></param>
		/// <returns></returns>
		public Color	GetPixel( int x, int y )
		{
			return m_Texture.GetPixel( x, y );
		}

		/// <summary>
		/// Unity.Texture Proxy Method
		/// </summary>
		/// <param name="_MipLevel"></param>
		/// <returns></returns>
		public Color[]	GetPixels( int _MipLevel )
		{
			return m_Texture.GetPixels( _MipLevel );
		}

		/// <summary>
		/// Unity.Texture Proxy Method
		/// </summary>
		/// <param name="x"></param>
		/// <param name="y"></param>
		/// <param name="_Content"></param>
		public void		SetPixel( int x, int y, Color _Content )
		{
			m_Texture.SetPixel( x, y, _Content );
			m_bDirty = true;
		}

		/// <summary>
		/// Unity.Texture Proxy Method
		/// </summary>
		/// <param name="_Content"></param>
		/// <param name="_MipLevel"></param>
		public void		SetPixels( Color[] _Content, int _MipLevel )
		{
			m_Texture.SetPixels( _Content, _MipLevel );
			m_bDirty = true;
		}

		/// <summary>
		/// Unity.Texture Proxy Method
		/// </summary>
		/// <param name="x"></param>
		/// <param name="y"></param>
		/// <param name="_Width"></param>
		/// <param name="_Height"></param>
		/// <param name="_Content"></param>
		/// <param name="_MipLevel"></param>
		public void		SetPixels( int x, int y, int _Width, int _Height, Color[] _Content, int _MipLevel )
		{
			m_Texture.SetPixels( x, y, _Width, _Height, _Content, _MipLevel );
			m_bDirty = true;
		}

		/// <summary>
		/// Unity.Texture Proxy Method
		/// </summary>
		public void		Apply()
		{
			m_Texture.Apply();
			m_bDirty = true;
		}

		/// <summary>
		/// Unity.Texture Proxy Method
		/// </summary>
		/// <param name="_bUpdateMipMaps"></param>
		public void		Apply( bool _bUpdateMipMaps )
		{
			m_Texture.Apply( _bUpdateMipMaps );
			m_bDirty = true;
		}

		/// <summary>
		/// Unity.Texture Proxy Method
		/// </summary>
		/// <param name="_bUpdateMipMaps"></param>
		/// <param name="_bMakeNoLongerReadable"></param>
		public void		Apply( bool _bUpdateMipMaps, bool _bMakeNoLongerReadable )
		{
			m_Texture.Apply( _bUpdateMipMaps, _bMakeNoLongerReadable );
			m_bDirty = true;
		}

		#region IDisposable Members

		/// <summary>
		/// Disposes of all resources used by the texture
		/// </summary>
		public void Dispose()
		{
			Help.SafeDestroy( ref m_Texture );
		}

		#endregion

		#endregion
	}
}