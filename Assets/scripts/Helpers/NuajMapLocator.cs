using System;
using UnityEngine;

using Nuaj;

/// <summary>
/// This script needs to be attached to a GameObject
/// You can then use it to correctly locate and scale a map that can be used by Nuaj' for local density variations
/// For example, this locator can be used to setup a local cloud density variation or a terrain emissive map to simulate lights from a city.
/// </summary>
public class	NuajMapLocator : MonoBehaviour
{
	#region CONSTANTS

	protected const float	MAP_SCALE = 1.0f;

	#endregion

	#region FIELDS

	[SerializeField] protected Texture2D		m_Texture = null;
	[SerializeField] protected Vector4			m_Offset = Vector4.zero;
	[SerializeField] protected Vector4			m_Factor = Vector4.one;

	#endregion

	#region PROPERTIES

	/// <summary>
	/// Gets or sets the texture attached to the locator
	/// </summary>
	public Texture2D		Texture
	{
		get { return m_Texture; }
		set { m_Texture = value; }
	}

	/// <summary>
	/// Gets or sets the offset to add to RGBA map values
	/// </summary>
	public Vector4			Offset
	{
		get { return m_Offset; }
		set { m_Offset = value; }
	}

	/// <summary>
	/// Gets or sets the factor to apply to RGBA map values
	/// </summary>
	public Vector4			Factor
	{
		get { return m_Factor; }
		set { m_Factor = value; }
	}

	#endregion

	#region METHODS

	void		OnDrawGizmos()
	{
		Gizmos.matrix = transform.localToWorldMatrix;
		Gizmos.color = UnityEngine.Color.yellow;
		Gizmos.DrawLine( new Vector3( -MAP_SCALE, 0.0f, -MAP_SCALE ), new Vector3( -MAP_SCALE, 0.0f, +MAP_SCALE ) );
		Gizmos.DrawLine( new Vector3( -MAP_SCALE, 0.0f, +MAP_SCALE ), new Vector3( +MAP_SCALE, 0.0f, +MAP_SCALE ) );
		Gizmos.DrawLine( new Vector3( +MAP_SCALE, 0.0f, +MAP_SCALE ), new Vector3( +MAP_SCALE, 0.0f, -MAP_SCALE ) );
		Gizmos.DrawLine( new Vector3( +MAP_SCALE, 0.0f, -MAP_SCALE ), new Vector3( -MAP_SCALE, 0.0f, -MAP_SCALE ) );

		Help.DrawTexture( m_Texture, transform.localToWorldMatrix, MAP_SCALE, true );
	}

	#endregion
}
