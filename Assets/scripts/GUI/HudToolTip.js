#pragma strict
#pragma downcast
/// <summary>
/// Example script that can be used to show tooltips.
/// </summary>


static var mInstance : HudToolTip;

var uiCamera : Camera;
var text : UILabel;
var background : UISlicedSprite;
var appearSpeed : float = 10f;
var scalingTransitions : boolean = true;

private var mTrans : Transform;
private var mTarget : float = 0f;
private var mCurrent : float = 0f;
private var mSize : Vector3;

private var mWidgets : Component[];

function Awake() { mInstance = this; }
function OnDestroy() { mInstance = null; }

/// <summary>
/// Get a list of widgets underneath the tooltip.
/// </summary>

function Start()
{
   mTrans = transform;
   mWidgets = gameObject.GetComponentsInChildren(UIWidget);
   mSize = mTrans.localScale;
   if (uiCamera == null) uiCamera = NGUITools.FindCameraForLayer(gameObject.layer);
   SetAlpha(0f);
}

/// <summary>
/// Update the tooltip's alpha based on the target value.
/// </summary>

function Update()
{
   if (mCurrent != mTarget)
   {
      mCurrent = Mathf.Lerp(mCurrent, mTarget, Time.deltaTime * appearSpeed);
      if (Mathf.Abs(mCurrent - mTarget) < 0.001f) mCurrent = mTarget;
      SetAlpha(mCurrent * mCurrent);
      
      if (scalingTransitions)
      {
         var offset : Vector3 = mSize * 0.25f;
         offset.y = -offset.y;
   
         var size : Vector3 = Vector3.one * (1.5f - mCurrent * 0.5f);
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
}

/// <summary>
/// Set the tooltip's text to the specified string.
/// </summary>

function SetText(tooltipText : String)
{
   if (text != null && !String.IsNullOrEmpty(tooltipText))
   {
      mTarget = 1f;
      if (text != null)
      text.text = tooltipText;
   }
   else
      mTarget = 0f;
}

/// <summary>
/// Show a tooltip with the specified text.
/// </summary>

static function ShowText(tooltipText : String)
{
   if (mInstance != null)
      mInstance.SetText(tooltipText);
}