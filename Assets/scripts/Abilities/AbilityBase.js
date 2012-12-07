#pragma strict
#pragma downcast

var ID : int;
var clickMode : int = 0;
var color : Color;
var duration : float;
var scaleCursor : boolean;
var lockAspect : boolean;
var lockResize : boolean;
var alpha : float = 0.33;
var minimum: Vector2;
var cost : float;
var costPerArea : float;
var tooltip : String;
var requiresColor : boolean;
var maxTargets : int;
var netView : NetworkView;

private var firstPoint : Vector3;
private var firstPointCtr : Vector3;
private var firstPointPlaced : boolean;
//private var percentText : TextMesh;
private var zone : Rect;


function Awake()
{
   SetColor(1.0, 1.0, 1.0);
   clickMode = 0;
   zone.width =  minimum.x;
   zone.height =  minimum.y;

   //percentText = transform.Find("PercentText").GetComponent(TextMesh);
   //percentText.transform.parent = null;
}

function SetMode(newMode : int)
{
   clickMode = newMode;

   switch (newMode)
   {
   case 0:
      firstPointPlaced = false;
      break;
   case 1:
      firstPointPlaced = true;
      firstPointCtr = transform.position;
      firstPointCtr.y = 1.0;
      firstPoint.x = transform.position.x - (minimum.x/2.0);
      firstPoint.z = transform.position.z - (minimum.y/2.0);
      firstPoint.y = 1.0;
      break;
   }
}

function Update()
{
   // Draw ray from camera mousepoint to ground plane.
   var hit : RaycastHit;
   var mask = (1 << 10); // terrain
   var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
   if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
   {
      transform.position = hit.point;
   }
   transform.position.y += (transform.localScale.y/2.0);

}

function OnDestroy()
{
   //if (percentText)
   //   Destroy(percentText.gameObject);
}

function SetChildrenColor(t : Transform, newColor : Color)
{
   if (t.renderer && t.renderer.material)
   {
      t.renderer.material.color = newColor;
      t.renderer.material.SetColor("_TintColor", newColor);
   }
   for (var child : Transform in t)
      SetChildrenColor(child, newColor);
}

@RPC
function SetColor(r : float, g : float, b : float)
{
   if (requiresColor)
   {
      var c : Color = Color(r,g,b, alpha);
      color = c;
      SetChildrenColor(transform, c);
   }
}

function SetColor(c : Color)
{
   SetColor(c.r, c.g, c.b);
}

function MakeCursor(isCursor : boolean)
{
   firstPointPlaced  = false;
   //percentText.renderer.enabled = false;
   enabled = isCursor;
   netView.enabled = !isCursor;
}

@RPC
function TriggerEffect()
{
   SendMessage("OnSpawnEffect", SendMessageOptions.DontRequireReceiver);
}