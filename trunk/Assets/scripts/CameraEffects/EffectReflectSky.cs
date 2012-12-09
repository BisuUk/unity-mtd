using System;
using System.Collections;
using UnityEngine;
using Nuaj;

/// <summary>
/// This camera effect initializes the reflection camera with the reflected sky
/// </summary>
[ExecuteInEditMode]
[RequireComponent( typeof(Camera) )]
public class	EffectReflectSky : MonoBehaviour
{
	#region FIELDS

	public GameObject			m_WaterObject = null;
	public float				m_DummyCloudHeightKm = 2.0f;

	protected NuajManager		m_Manager = null;
	protected NuajMaterial		m_MaterialClear = null;

	#endregion

	#region PROPERTIES

	public NuajManager		Manager
	{
		get
		{
			if ( m_Manager == null )
				m_Manager = FindObjectOfType( typeof(NuajManager) ) as NuajManager;
			return m_Manager;
		}
	}

	#endregion

	#region METHODS

	void	OnEnable()
	{
		try
		{
			m_MaterialClear = Help.CreateMaterial( "ComposeReflection" );
		}
		catch ( System.Exception _e )
		{
			Help.LogError( "An error occurred while creating the Sky Reflection shader : " + _e.Message );
		}
	}

	void	OnDisable()
	{
		Help.SafeDestroyNuaj( ref m_MaterialClear );
	}

	/// <summary>
	/// Post-process the camera's render texture with our sky reflection
	/// </summary>
	void	OnRenderImage( RenderTexture _Source, RenderTexture _Destination )
	{
		if ( Manager == null || m_MaterialClear == null || Manager.Camera == null || Manager.Camera.camera == null )
			return;
		if ( camera.targetTexture == null )
			return;	// The reflection camera should have a render texture so we can clear it !

		// Assign "above camera" data
		Camera	CameraAbove = Manager.Camera.camera;
		float	TanFOV = Mathf.Tan( 0.5f * Mathf.Deg2Rad * CameraAbove.fieldOfView );
		m_MaterialClear.SetMatrix( "_Camera2World", CameraAbove.cameraToWorldMatrix );
		m_MaterialClear.SetMatrix( "_World2Camera", CameraAbove.worldToCameraMatrix );
		m_MaterialClear.SetVector( "_CameraData", new Vector4( CameraAbove.aspect * TanFOV, TanFOV, CameraAbove.nearClipPlane, CameraAbove.farClipPlane ) );

		// Assign "mirrored camera" data
		float	TanFOVMirror = Mathf.Tan( 0.5f * Mathf.Deg2Rad * camera.fieldOfView );
		m_MaterialClear.SetMatrix( "_BelowCamera2World", camera.cameraToWorldMatrix );
		m_MaterialClear.SetVector( "_BelowCameraData", new Vector4( camera.aspect * TanFOVMirror, TanFOVMirror, camera.nearClipPlane, camera.farClipPlane ) );

		// Assign water object data
		if ( m_WaterObject != null )
			m_MaterialClear.SetMatrix( "_Water2World", m_WaterObject.transform.localToWorldMatrix );

		m_MaterialClear.SetVector( "_BackgroundColorKey", camera.backgroundColor );	// Feed the camera's clear color as a color key for the shader so we know where to apply clouds
		m_MaterialClear.SetFloat( "_DummyCloudHeightKm", m_DummyCloudHeightKm );	// Feed the dummy cloud reflection altitude

		m_MaterialClear.SetTexture( "_TexScattering", m_Manager.TextureScattering );
		m_MaterialClear.Blit( _Source, _Destination, 0 );
	}

	#endregion
}