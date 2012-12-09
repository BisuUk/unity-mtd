using UnityEngine;
using System.Collections;

/// <summary>
/// Projects the light's position in front of the camera so the cookie follows the view
/// USAGE : Attach to your Sun directional light
/// </summary>
[ExecuteInEditMode]
public class ProjectLightToGround : MonoBehaviour
{
	protected NuajManager	m_Manager = null;
	protected NuajManager	Manager
	{
		get
		{
			if ( m_Manager == null )
				m_Manager = FindObjectOfType( typeof(NuajManager) ) as NuajManager;

			return m_Manager;
		}
	}

	void		Update()
	{
		if ( !enabled )
			return;

		// Get the manager first...
		if ( Manager == null || Manager.Camera == null )
			return;	// No camera attached...

		Transform	T = Manager.Camera.transform;
		Vector3		Position = T.position;
		Vector3		View = T.forward;
		Position += 0.5f * Manager.LightCookieSize * View;	// Place it in front of the camera

		// Simply project camera position to the specified altitude
		if ( !Manager.LightCookieSampleAtCameraAltitude )
			Position.y = Manager.LightCookieSampleAltitudeKm / m_Manager.WorldUnit2Kilometer;

		transform.position = Position;

		// TODO: project position using view ray hitting the ground, then update cookie size on light and in Nuaj, based on distance
		//	(as soon as Unity permits changing the cookie size... UU')
	}
}
