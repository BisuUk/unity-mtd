using System;
using UnityEngine;

namespace Nuaj
{
	/// <summary>
	/// This is the global static class that Nuaj' uses to control time.
	/// This time value is used for animation of clouds, daylight cycle and satellites revolutions.
	/// </summary>
	public class	NuajTime
	{
		#region FIELDS

		protected static float	ms_Time = 0.0f;
		protected static float	ms_TimeMultiplier = 1.0f;
		protected static float	ms_DeltaTime = 0.0f;

		#endregion

		#region PROPERTIES

		/// <summary>
		/// Gets or sets the time value in seconds
		/// </summary>
		public static float		Time			{ get { return ms_Time; } set { ms_Time = value; ms_DeltaTime = 0.0f; } }

		/// <summary>
		/// Gets or sets the time multiplier.
		/// By default, the time evolves as UnityEngine.Time with a time multiplier of 1 but you
		///  can accelerate (multiplier &gt; 1), stop time (multiplier = 0) or even go back in time (multiplier &lt; 0).
		/// </summary>
		public static float		TimeMultiplier	{ get { return ms_TimeMultiplier; } set { ms_TimeMultiplier = value; } }

		/// <summary>
		/// Gets the difference between current and previous values of Nuaj' time
		/// NOTE: This value is valid only after a call to UpdateTime()
		/// </summary>
		public static float		DeltaTime		{ get { return ms_DeltaTime; } }

		/// <summary>
		/// Gets Unity's Time.deltaTime value
		/// </summary>
		public static float		UnityDeltaTime	{ get { return Application.isEditor && !Application.isPlaying ? 0.1f : UnityEngine.Time.deltaTime; } }

		#endregion

		#region METHODS

		/// <summary>
		/// Updates Nuaj' time using Unity's delta time since last call
		/// </summary>
		public static void		UpdateTime()
		{
			UpdateTime( UnityDeltaTime );
		}

		/// <summary>
		/// Updates Nuaj' time using the specified delta time
		/// </summary>
		/// <param name="_DeltaTime">The delta time to update with</param>
		public static void		UpdateTime( float _DeltaTime )
		{
			float	OldTime = ms_Time;
			ms_Time += ms_TimeMultiplier * _DeltaTime;
			ms_DeltaTime = ms_Time - OldTime;
		}

		#endregion
	}
}