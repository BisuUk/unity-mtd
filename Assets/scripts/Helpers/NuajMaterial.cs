using System;
using System.Collections.Generic;
using UnityEngine;

namespace Nuaj
{
	/// <summary>
	/// This is a wrapper for Unity materials that keeps a cache of NuajTextures
	///  to verify if they actually need uploading to the graphics card.
	/// A Nuaj texture gets uploaded only if it's not the same texture as the one
	///  from last call OR if the Nuaj texture has its Dirty flag set.
	/// </summary>
	public class	NuajMaterial : IDisposable
	{
		#region FIELDS

		protected Material							m_Material = null;
		protected Dictionary<string,NuajTexture2D>	m_ParamName2Texture = new Dictionary<string,NuajTexture2D>();
		protected Dictionary<string,NuajCubemap>	m_ParamName2CubeMap = new Dictionary<string,NuajCubemap>();

		protected static Dictionary<string,NuajTexture2D>	ms_GlobalParamName2Texture = new Dictionary<string,NuajTexture2D>();

		#endregion

		#region PROPERTIES

		/// <summary>
		/// Gets the wrapped Unity.Material
		/// </summary>
		public Material			Material	{ get { return m_Material; } }

		#endregion

		#region METHODS

		/// <summary>
		/// For de-serialization purpose only, shouldn't be called !
		/// </summary>
		public NuajMaterial()
		{

		}

		public NuajMaterial( string _ShaderResourceName )
		{
			Shader	S = Help.LoadShader( _ShaderResourceName );
			if ( S == null )
				throw new Exception( "NuajMaterial.ctor() => Could not find a shader named \"" + _ShaderResourceName + "\" !" );

			if ( !S.isSupported )
				throw new Exception( "NuajMaterial.ctor() => Shader \"" + _ShaderResourceName + "\" contains errors or is not supported on this machine !" );

			m_Material = new Material( S );
			m_Material.hideFlags = HideFlags.HideAndDontSave;
		}

		/// <summary>
		/// Renders from source to target using the specified material pass
		/// </summary>
		/// <param name="_Source"></param>
		/// <param name="_Target"></param>
		/// <param name="_PassIndex"></param>
		public void		Blit( Texture _Source, RenderTexture _Target, int _PassIndex )
		{
			Graphics.Blit( _Source, _Target, m_Material, _PassIndex );
		}

		#region Unity.Material Proxy Methods

		/// <summary>
		/// Unity.Material Proxy Method
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Value"></param>
		public void		SetFloat( string _Name, float _Value )
		{
			m_Material.SetFloat( _Name, _Value );
		}

		/// <summary>
		/// Unity.Material Proxy Method
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Value"></param>
		public void		SetVector( string _Name, Vector2 _Value )
		{
			m_Material.SetVector( _Name, _Value );
		}

		/// <summary>
		/// Unity.Material Proxy Method
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Value"></param>
		public void		SetVector( string _Name, Vector3 _Value )
		{
			m_Material.SetVector( _Name, _Value );
		}

		/// <summary>
		/// Unity.Material Proxy Method
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Value"></param>
		public void		SetVector( string _Name, Vector4 _Value )
		{
			m_Material.SetVector( _Name, _Value );
		}

		/// <summary>
		/// Unity.Material Proxy Method
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Value"></param>
		public void		SetColor( string _Name, Color _Value )
		{
			m_Material.SetColor( _Name, _Value );
		}

		/// <summary>
		/// Unity.Material Proxy Method
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Value"></param>
		public void		SetMatrix( string _Name, Matrix4x4 _Value )
		{
			m_Material.SetMatrix( _Name, _Value );
		}

		/// <summary>
		/// Sets the texture as-is, without checking for dirty state
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Value"></param>
		public void		SetTextureRAW( string _Name, Texture _Value )
		{
			m_Material.SetTexture( _Name, _Value );
		}

		/// <summary>
		/// This sets a texture ONLY if it has changed (i.e. not the same or content is dirty)
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Value"></param>
		/// <param name="_bClearDirtyFlag">True to mark the texture as "clean" once assigned</param>
		public void		SetTexture( string _Name, NuajTexture2D _Value, bool _bClearDirtyFlag )
		{
			NuajTexture2D	CurrentTexture = m_ParamName2Texture.ContainsKey( _Name ) ? m_ParamName2Texture[_Name] : null;
			if ( _Value == CurrentTexture && _Value != null && !_Value.IsDirty )
				return;	// No change in texture or content...

			m_ParamName2Texture[_Name] = _Value;	// Update to new texture

			// Upload...
			m_Material.SetTexture( _Name, _Value != null ? _Value.Texture : null );

			if ( _bClearDirtyFlag && _Value != null )
				_Value.IsDirty = false;	// This texture has been uploaded so it's not dirty anymore...

			// Notify
			Help.LogDebugWarning( "Texture \"" + (_Value != null && _Value.Texture ? _Value.Texture.name : "null") + "\" has been uploaded as \"" + m_Material.name + "." + _Name + "\"" );
		}

		/// <summary>
		/// This sets a texture ONLY if it has changed (i.e. not the same or content is dirty)
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Value"></param>
		/// <param name="_bClearDirtyFlag">True to mark the texture as "clean" once assigned</param>
		public void		SetTexture( string _Name, NuajCubemap _Value, bool _bClearDirtyFlag )
		{
			NuajCubemap	CurrentTexture = m_ParamName2CubeMap.ContainsKey( _Name ) ? m_ParamName2CubeMap[_Name] : null;
			if ( _Value == CurrentTexture && _Value != null && !_Value.IsDirty )
				return;	// No change in texture or content...

			m_ParamName2CubeMap[_Name] = _Value;	// Update to new texture

			// Upload...
			m_Material.SetTexture( _Name, _Value != null ? _Value.CubeMap : null );

			if ( _bClearDirtyFlag && _Value != null )
				_Value.IsDirty = false;	// This texture has been uploaded so it's not dirty anymore...

			// Notify
			Help.LogDebugWarning( "Cube Map \"" + (_Value != null && _Value.CubeMap != null ? _Value.CubeMap.name : "null") + "\" has been uploaded as \"" + m_Material.name + "." + _Name + "\"" );
		}

		/// <summary>
		/// Sets a RenderTexture as a texture input for the material
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Value"></param>
		public void		SetTexture( string _Name, RenderTexture _Value )
		{
			m_Material.SetTexture( _Name, _Value );
			m_ParamName2Texture[_Name] = null;	// Also clear the list if it already contains a 2D texture for that parameter
		}

		/// <summary>
		/// Unity.Material Proxy Method
		/// </summary>
		/// <param name="_Source"></param>
		public void		CopyPropertiesFromMaterial( NuajMaterial _Source )
		{
			m_Material.CopyPropertiesFromMaterial( _Source.Material );

			// Copy other material's tables
			foreach ( string Key in _Source.m_ParamName2Texture.Keys )
				m_ParamName2Texture[Key] = _Source.m_ParamName2Texture[Key];
			foreach ( string Key in _Source.m_ParamName2CubeMap.Keys )
				m_ParamName2CubeMap[Key] = _Source.m_ParamName2CubeMap[Key];
		}

		/// <summary>
		/// Unity.Material Proxy Method
		/// </summary>
		/// <param name="_PassIndex"></param>
		public void		SetPass( int _PassIndex )
		{
			m_Material.SetPass( _PassIndex );
		}

		#endregion

		#region Unity.Shader Static Proxy Methods

		/// <summary>
		/// Unity.Shader Proxy Method
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Value"></param>
		public static void	SetGlobalFloat( string _Name, float _Value )
		{
			Shader.SetGlobalFloat( _Name, _Value );
		}

		/// <summary>
		/// Unity.Shader Proxy Method
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Value"></param>
		public static void	SetGlobalVector( string _Name, Vector2 _Value )
		{
			Shader.SetGlobalVector( _Name, _Value );
		}

		/// <summary>
		/// Unity.Shader Proxy Method
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Value"></param>
		public static void	SetGlobalVector( string _Name, Vector3 _Value )
		{
			Shader.SetGlobalVector( _Name, _Value );
		}

		/// <summary>
		/// Unity.Shader Proxy Method
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Value"></param>
		public static void	SetGlobalVector( string _Name, Vector4 _Value )
		{
			Shader.SetGlobalVector( _Name, _Value );
		}

		/// <summary>
		/// Unity.Shader Proxy Method
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Value"></param>
		public static void	SetGlobalMatrix( string _Name, Matrix4x4 _Value )
		{
			Shader.SetGlobalMatrix( _Name, _Value );
		}

		/// <summary>
		/// This sets a texture ONLY if it has changed (i.e. not the same or content is dirty)
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Value"></param>
		/// <param name="_bClearDirtyFlag">True to mark the texture as "clean" once assigned</param>
		public static void	SetGlobalTexture( string _Name, NuajTexture2D _Value, bool _bClearDirtyFlag )
		{
			NuajTexture2D	CurrentTexture = ms_GlobalParamName2Texture.ContainsKey( _Name ) ? ms_GlobalParamName2Texture[_Name] : null;
			if ( _Value == CurrentTexture && _Value != null && !_Value.IsDirty )
				return;	// No change in texture or content...

			ms_GlobalParamName2Texture[_Name] = _Value;	// Update to new texture

			// Upload...
			Shader.SetGlobalTexture( _Name, _Value != null ? _Value.Texture : null );

			if ( _bClearDirtyFlag && _Value != null )
				_Value.IsDirty = false;	// This texture has been uploaded so it's not dirty anymore...

			// Notify
			Help.LogDebugWarning( "Texture \"" + (_Value != null && _Value.Texture ? _Value.Texture.name : "null") + "\" has been uploaded as GLOBAL \"" + _Name + "\"" );
		}

		/// <summary>
		/// Unity.Shader Proxy Method
		/// </summary>
		/// <param name="_Name"></param>
		/// <param name="_Value"></param>
		public static void	SetGlobalTexture( string _Name, RenderTexture _Value )
		{
			Shader.SetGlobalTexture( _Name, _Value );
			ms_GlobalParamName2Texture[_Name] = null;	// Also clear the list if it already contains a 2D texture for that parameter
		}

		#endregion

		#region IDisposable Members

		public void Dispose()
		{
			Help.SafeDestroy( ref m_Material );
		}

		#endregion

		#endregion
	}
}