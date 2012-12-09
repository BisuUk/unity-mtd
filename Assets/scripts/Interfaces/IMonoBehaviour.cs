using System;
using System.Collections;
using UnityEngine;

namespace Nuaj
{
	/// <summary>
	/// Base interface for objects that support the basic MonoBehaviour methods
	/// </summary>
	public interface IMonoBehaviour
	{
		/// <summary>
		/// Same as MonoBehaviour.OnDestroy()
		/// This is where clean up should take place
		/// </summary>
		void			OnDestroy();

		/// <summary>
		/// Same as MonoBehaviour.Awake()
		/// This is where deserialized data should be cached
		/// </summary>
		void			Awake();

		/// <summary>
		/// Same as MonoBehaviour.Start()
		/// </summary>
		void			Start();

		/// <summary>
		/// Same as MonoBehaviour.OnEnable()
		/// This is where the materials and render targets should be created
		/// </summary>
		void			OnEnable();

		/// <summary>
		/// Same as MonoBehaviour.OnDisable()
		/// This is where the materials and render targets should be destroyed
		/// </summary>
		void			OnDisable();

		/// <summary>
		/// Same as MonoBehaviour.Update()
		/// This is where time-dependent data should be updated
		/// </summary>
		void			Update();
	}
}