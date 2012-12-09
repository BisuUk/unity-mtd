using System;
using System.Collections.Generic;
using UnityEngine;

namespace Nuaj
{
	/// <summary>
	/// This is a wrapper for Unity cube maps that maintain a "dirty state"
	///  so materials don't upload textures if they haven't changed...
	/// </summary>
	[Serializable]
	public class	NuajCubemap : IDisposable
	{
		#region FIELDS

		[SerializeField] protected Cubemap	m_CubeMap = null;
		protected bool						m_bDirty = true;

		#endregion

		#region PROPERTIES

		/// <summary>
		/// Gets the wrapped texture
		/// </summary>
		public Cubemap		CubeMap
		{
			get { return m_CubeMap; }
			set
			{
				if ( value == m_CubeMap )
					return;

				m_CubeMap = value;
				m_bDirty = true;
			}
		}

		/// <summary>
		/// Gets the dirty state
		/// </summary>
		public bool				IsDirty		{ get { return m_bDirty; } internal set { m_bDirty = value; } }

		#endregion

		#region METHODS

		/// <summary>
		/// For de-serialization purpose only, shouldn't be called !
		/// </summary>
		public NuajCubemap()
		{
		}

		#region IDisposable Members

		public void Dispose()
		{
			Help.SafeDestroy( ref m_CubeMap );
		}

		#endregion

		#endregion
	}
}