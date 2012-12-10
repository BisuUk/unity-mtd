//----------------------------------------------
//            NGUI: Next-Gen UI kit
// Copyright © 2011-2012 Tasharen Entertainment
//----------------------------------------------

using UnityEngine;

/// <summary>
/// Tween the object's position.
/// </summary>

[AddComponentMenu("NGUI/Tween/PositionTarget")]
public class TweenPositionTarget : UITweener
{
	public Vector3 from;
	public Vector3 to;
   public Transform target;

	Transform mTrans;

	public Transform cachedTransform { get { if (mTrans == null) mTrans = transform; return mTrans; } }
	public Vector3 position { get { return cachedTransform.position; } set { cachedTransform.position = value; } }

	override protected void OnUpdate (float factor, bool isFinished)
   {
      Vector3 newPos = from * (1f - factor) + to * factor;
      cachedTransform.position = ((target != null) ? target.position : Vector3.zero) + newPos;
   }

	/// <summary>
	/// Start the tweening operation.
	/// </summary>

	static public TweenPositionTarget Begin (GameObject go, float duration, Vector3 pos)
	{
		TweenPositionTarget comp = UITweener.Begin<TweenPositionTarget>(go, duration);
		comp.from = comp.position;
		comp.to = pos;
		return comp;
	}
}