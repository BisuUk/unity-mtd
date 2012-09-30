#pragma strict
#pragma downcast
/// <summary>
/// Example script that can be used to show tooltips.
/// </summary>
enum TooltipTypeEnum
{
   TOOLTIP_STATIC,
   TOOLTIP_HOVER
}
var tooltipType : TooltipTypeEnum;
var uiCamera : Camera;
var text : UILabel;
var background : UISlicedSprite;
var appearSpeed : float = 10f;
var scalingTransitions : boolean = true;

private var mTrans : Transform;
private var mTargetAlpha : float = 0f;
private var mCurrentAlpha : float = 0f;
private var mSize : Vector3;
private var mPos : Vector3;
private var mWidgets : Component[];
private var mOriginalAlpha : float;

/// <summary>
/// Get a list of widgets underneath the tooltip.
/// </summary>

function Start()
{
   mTrans = transform;
   mWidgets = gameObject.GetComponentsInChildren(UIWidget);
   mOriginalAlpha = background.color.a;
   mSize = mTrans.localScale;
   if (uiCamera == null) uiCamera = NGUITools.FindCameraForLayer(gameObject.layer);
   SetAlpha(0f);
}

/// <summary>
/// Update the tooltip's alpha based on the target value.
/// </summary>

function Update()
{
   if (mCurrentAlpha != mTargetAlpha)
   {
      mCurrentAlpha = Mathf.Lerp(mCurrentAlpha, mTargetAlpha, Time.deltaTime * appearSpeed);
      if (Mathf.Abs(mCurrentAlpha - mTargetAlpha) < 0.001f) mCurrentAlpha = mTargetAlpha;
      SetAlpha(mCurrentAlpha * mCurrentAlpha);
      
      if (scalingTransitions)
      {
         var offset : Vector3 = mSize * 0.25f;
         offset.y = -offset.y;
   
         var size : Vector3 = Vector3.one * (1.5f - mCurrentAlpha * 0.5f);
         mTrans.localScale = size;
      }
   }
}

/// <summary>
/// Set the alpha of all widgets.
/// </summary>

function SetAlpha(val : float)
{
   for (var w : UIWidget in  mWidgets)
   {
       w.color.a = val;
   }
   if (val > mOriginalAlpha)
      background.color.a = mOriginalAlpha;
}

/// <summary>
/// Set the tooltip's text to the specified string.
/// </summary>

function SetText(tooltipText : String, position : Vector2)
{
   if (text != null && !String.IsNullOrEmpty(tooltipText))
   {
      mTargetAlpha = 1f;
      text.text = tooltipText;

      if (tooltipType == TooltipTypeEnum.TOOLTIP_HOVER)
      {
         mPos = position;
         Adjust();
      }
   }
   else
      mTargetAlpha = 0f;
}

private function Adjust()
{
   if (uiCamera != null)
   {
      // Since the screen can be of different than expected size, we want to convert
      // mouse coordinates to view space, then convert that to world position.
      mPos.x = Mathf.Clamp01(mPos.x / Screen.width);
      mPos.y = Mathf.Clamp01(mPos.y / Screen.height);
      
      // Calculate the ratio of the camera's target orthographic size to current screen size
      var activeSize : float = uiCamera.orthographicSize / mTrans.parent.lossyScale.y;
      var ratio : float = (Screen.height * 0.5f) / activeSize;

      // Calculate the maximum on-screen size of the tooltip window
      var max : Vector2  = new Vector2(ratio * mSize.x / Screen.width, ratio * mSize.y / Screen.height);
      
      // Limit the tooltip to always be visible
      mPos.x = Mathf.Min(mPos.x, 1f - max.x);
      mPos.y = Mathf.Max(mPos.y, max.y);
      
      // Update the absolute position and save the local one
      mTrans.position = uiCamera.ViewportToWorldPoint(mPos);
      mPos = mTrans.localPosition;
      mPos.x = Mathf.Round(mPos.x);
      mPos.y = Mathf.Round(mPos.y);
      mTrans.localPosition = mPos;
   }
   else
   {
      // Don't let the tooltip leave the screen area
      if (mPos.x + mSize.x > Screen.width) mPos.x = Screen.width - mSize.x;
      if (mPos.y - mSize.y < 0f) mPos.y = mSize.y;

      // Simple calculation that assumes that the camera is of fixed size
      mPos.x -= Screen.width * 0.5f;
      mPos.y -= Screen.height * 0.5f;
   }
}


