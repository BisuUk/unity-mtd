using System;
using System.Collections;
using UnityEngine;
using UnityEditor;

using Nuaj;
using Nuaj.GUI;

/// <summary>
/// This is a small utility to render Nuaj' output into a cubemap
/// Unfortunately, I had to rewrite the entire thing since using "Camera.RenderToCubeMap()" threw an exception when Nuaj' was enabled...
/// </summary>
public class CubeMapRendererWindow : EditorWindow
{
	#region FIELDS

	protected NuajManager	m_Manager = null;
	protected GameObject	m_ManagerCamera = null;
	protected GameObject	m_Camera = null;
	protected Cubemap		m_CubeMap = null;

	protected bool			m_bRenderScene = true;

	#endregion

	#region PROPERTIES

	/// <summary>
	/// Gets or sets the NuajManager to generate the cube map with
	/// </summary>
	public NuajManager		Manager
	{
		get { return m_Manager; }
		set
		{
			m_Manager = value;
			if ( m_Manager != null )
				m_Camera = m_ManagerCamera = m_Manager.Camera;
		}
	}

	#endregion

	#region METHODS

	public void	OnGUI()
	{
		if ( m_Manager == null )
		{
			GUIHelpers.InfosArea( "There is no Nuaj' Manager to generate the cube map from !", GUIHelpers.INFOS_AREA_TYPE.ERROR );
			return;
		}

		// Ask for camera
		GUIHelpers.BeginHorizontal();
		GUIHelpers.EnableHorizontalGroups = false;
		m_Camera = GUIHelpers.SelectObject<GameObject>( new GUIContent( "Camera Object", "The object used to render the cube map from" ), m_Camera, null );
		if ( GUIHelpers.Button( new GUIContent( "Reset", "Resets the camera to the Nuaj' camera" ) ) )
			m_Camera = m_ManagerCamera;
		GUIHelpers.EnableHorizontalGroups = true;
		GUIHelpers.EndHorizontal();

		// Ask for scene filtering
		m_bRenderScene = GUIHelpers.CheckBox( new GUIContent( "Render Scene", "Shows or hides the scene in the cube map" ), m_bRenderScene, null );
		GUIHelpers.Separate();

		// Ask for target cube map
		m_CubeMap = GUIHelpers.SelectCubeMap( new GUIContent( "Target Cube Map", "Selects the target cube map to render to" ), m_CubeMap, null );

		GUIHelpers.Separate( 20 );

		using ( GUIHelpers.GUIEnabler( m_Camera != null && m_Camera.camera != null && m_CubeMap != null ) )
		{
			if ( GUIHelpers.Button( new GUIContent( "Render CubeMap" ) ) )
				Render();
		}
	}

	protected void	Render()
	{
		// Backup stuff
		GameObject		OldDriveCamera = m_Manager.Camera;
		NuajManager.LUMINANCE_COMPUTATION_TYPE	OldLuminanceComputationType = m_Manager.LuminanceComputationType;
		GameObject		TempCamera = null;
		RenderTexture	RT = null;
		RenderTexture	DummyTarget = null;
		Texture2D		Tex = null;

		try
		{
			// Create a temporary game object with a camera
			TempCamera = new GameObject( "CubemapCamera", typeof(Camera) );
			TempCamera.transform.position = m_Camera.transform.position;
			if ( m_Camera.camera != null )
				TempCamera.camera.CopyFrom( m_Camera.camera );
			TempCamera.camera.fov = 90.0f;
			TempCamera.camera.aspect = 1.0f;
			if ( !m_bRenderScene )
				TempCamera.camera.cullingMask = 0;

			m_Camera.active = false;
			TempCamera.active = true;

			// Create and assign the render target to render to
			DummyTarget = new RenderTexture( m_CubeMap.width, m_CubeMap.width, 0, RenderTextureFormat.ARGB32 );
			RT = new RenderTexture( m_CubeMap.width, m_CubeMap.width, 0, RenderTextureFormat.ARGB32 );
			Tex = new Texture2D( m_CubeMap.width, m_CubeMap.width, TextureFormat.ARGB32, false );

			RenderTexture.active = DummyTarget;

			// Assign the new dummy camera with its dummy target to the manager
			m_Manager.Camera = TempCamera;

			// Assign our render target to the camera effect
			EffectComposeAtmosphere	CamEffect = TempCamera.GetComponent<EffectComposeAtmosphere>();
			if ( CamEffect == null )
				throw new Exception( "EffectComposeAtmosphere() could not be found on the temporary camera object.\nRendering cannot proceed..." );

			CamEffect.Target = RT;

			// Ask the camera to render a couple of frames to ensure tone mapping had time to accomodate
			for ( int SafeFrameIndex=0; SafeFrameIndex < 10; SafeFrameIndex++ )
				TempCamera.camera.Render();

			m_Manager.LuminanceComputationType = NuajManager.LUMINANCE_COMPUTATION_TYPE.CUSTOM;	// Prevent any further adaptation during rendering of the  faces

			// Render the 6 faces
			Quaternion[]	Rotations = new Quaternion[6]
			{
				Quaternion.AngleAxis( +90.0f, new Vector3( 0.0f, 1.0f, 0.0f ) ),	// +X
				Quaternion.AngleAxis( -90.0f, new Vector3( 0.0f, 1.0f, 0.0f ) ),	// -X
				Quaternion.AngleAxis( +90.0f, new Vector3( 1.0f, 0.0f, 0.0f ) ),	// +Y
				Quaternion.AngleAxis( -90.0f, new Vector3( 1.0f, 0.0f, 0.0f ) ),	// -Y
				Quaternion.AngleAxis( 0.0f, new Vector3( 0.0f, 1.0f, 0.0f ) ),		// +Z
				Quaternion.AngleAxis( 180.0f, new Vector3( 0.0f, 1.0f, 0.0f ) ),	// -Z
			};
			
			Color[]	Pixels = null;
			for ( int FaceIndex=0; FaceIndex < 6; FaceIndex++ )
			{
				// Render one face
				TempCamera.transform.rotation = Quaternion.AngleAxis( 180.0f, Vector3.forward ) * Rotations[FaceIndex];
				TempCamera.camera.Render();

				// Read back from render target
				RenderTexture.active = RT;
				Tex.ReadPixels( new Rect( 0, 0, m_CubeMap.width, m_CubeMap.height ), 0, 0 );
				Tex.Apply();
				RenderTexture.active = DummyTarget;

				// Read back from texture
				Pixels = Tex.GetPixels( 0 );

				// Assign to cube map face
				m_CubeMap.SetPixels( Pixels, (CubemapFace) FaceIndex );
				m_CubeMap.Apply( true );
			}

			// Clear target
			CamEffect.Target = null;
			RenderTexture.active = null;

			// Success !
			GUIHelpers.MessageBox( "CubeMap rendering successful !", "OK" );
		}
		catch ( Exception _e )
		{
			GUIHelpers.MessageBox( "CubeMap rendering failed for the following reason :\n" + _e.Message, "Damn it !" );
		}
		finally
		{
			// Restore stuff
			m_Camera.active = true;
			m_Manager.Camera = OldDriveCamera;
			m_Manager.LuminanceComputationType = OldLuminanceComputationType;
			if ( DummyTarget != null )
				DestroyImmediate( DummyTarget );
			if ( RT != null )
				DestroyImmediate( RT );
			if ( Tex != null )
				DestroyImmediate( Tex );
			if ( TempCamera != null )
				DestroyImmediate( TempCamera );
			RenderTexture.active = null;
		}
	}

	#endregion
}
