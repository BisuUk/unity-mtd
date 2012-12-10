#pragma strict
#pragma downcast

/// <summary>
/// Example script showing how to add UI window that follows an object drawn by another camera.
/// </summary>

/// <summary>
/// Target object this UI element should follow.
/// </summary>

var target : Transform;
var worldOffset : Vector3;
var pixelOffset : Vector3;

private var mTrans : Transform;
private var mGameCam : Camera;
private var mUICam : Camera;
private var mPos : Vector3;
private var mVisible : boolean = true;

function Start ()
{
   if (target == null) { Destroy(gameObject); return; }
   mTrans = transform;
   mGameCam = NGUITools.FindCameraForLayer(target.gameObject.layer);
   mUICam = NGUITools.FindCameraForLayer(gameObject.layer);
}

function LateUpdate()
{
   if (target == null) { Destroy(gameObject); return; }
   mPos = mGameCam.WorldToViewportPoint(target.position+ worldOffset) + pixelOffset;

   
   var visible : boolean = (mPos.z > 0f && mPos.x > 0f && mPos.x < 1f && mPos.y > 0f && mPos.y < 1f);
   
   if (mVisible != visible)
   {
      mVisible = visible;
      var widgets = gameObject.GetComponentsInChildren(UIWidget);
      for (var w : UIWidget in widgets) w.enabled = mVisible;
   }

   if (mVisible)
   {
      mPos = mUICam.ViewportToWorldPoint(mPos);
      mPos.z = 0f;
      mTrans.position = mPos;
   }
}
