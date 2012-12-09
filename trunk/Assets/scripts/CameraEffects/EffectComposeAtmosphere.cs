using System;
using System.Collections;
using UnityEngine;

/// <summary>
/// This is the main Nuaj' camera effect that composes the rendered atmospheric effects together
/// </summary>
[ExecuteInEditMode]
[RequireComponent( typeof(Camera) )]
public class	EffectComposeAtmosphere : MonoBehaviour
{
	#region FIELDS

	protected NuajManager		m_Owner = null;
	protected RenderTexture		m_Target = null;

	#endregion

	#region PROPERTIES

	public NuajManager		Owner	{ get { return m_Owner; } internal set { m_Owner = value; } }

	/// <summary>
	/// Gets or sets an optional target to render to
	/// This is useful when rendering to a cube map
	/// </summary>
	public RenderTexture	Target	{ get { return m_Target; } set { m_Target = value; } }

	#endregion

	#region METHODS

	void	OnEnable()
	{
		Nuaj.Help.LogDebug( "EffectComposeAtmosphere.OnEnable() !" );

		// Make the camera render depth (should be already the case with a deferred pipeline)
		camera.depthTextureMode |= DepthTextureMode.Depth;
	}

	static int	ms_Counter = 0;
	void	OnPreCull()
	{
		Nuaj.Help.LogDebugSeparate( "ON PRE-CULL() FRAME #" + ms_Counter + " > " );
		if ( m_Owner == null )
		{
			Nuaj.Help.LogError( "EffectComposeAtmosphere has an invalid owner !" );
			return;
		}

		// Notify the owner to recreate all pertinent render targets
		// Of course, nothing is re-created if the dimensions are the same...
		m_Owner.InitializeTargets( Screen.width, Screen.height );
	}

	/// <summary>
	/// Applies post-processing on the scene
	/// In short : creates and composes the atmosphere with the scene and tone maps the result
	/// </summary>
	/// <param name="_Source"></param>
	/// <param name="_Destination"></param>
	public void	OnRenderImage( RenderTexture _Source, RenderTexture _Destination )
	{
		if ( !enabled )
			return;
		if ( m_Owner == null )
		{
			Nuaj.Help.LogError( "EffectComposeAtmosphere has an invalid owner !" );
			return;
		}
		if ( !m_Owner.enabled || !m_Owner.gameObject.active )
		{	// Don't render anything
			Graphics.Blit( _Source, null as RenderTexture );
			return;
		}

		// Compute camera data
		float	TanHalfFOV = Mathf.Tan( 0.5f * camera.fieldOfView * Mathf.PI / 180.0f );
		Vector4	CameraData = new Vector4( camera.aspect * TanHalfFOV, TanHalfFOV, camera.nearClipPlane, camera.farClipPlane );

		// Render clouds, sky, atmosphere, etc.
		m_Owner.Render( CameraData, camera.cameraToWorldMatrix, camera.worldToCameraMatrix );

		// Compose and Tone-map
		m_Owner.PostProcess( _Source, m_Target != null ? m_Target : _Destination );

		// Frame counter
		ms_Counter++;
	}

	public void	OnPostRender()
	{
		if ( m_Owner != null )
			m_Owner.EndFrame();
	}

	#endregion
}