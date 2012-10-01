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
      hit.point.y += 0.2;
      //percentText.renderer.material.color = (cost > Game.player.credits) ? Color.red : Utility.creditsTextColor;
   }

   if (firstPointPlaced)
   {
      if (!lockResize)
      {
         if (lockAspect)
         {
            var diff : Vector3 = hit.point - firstPoint;
            var diffx : float = Mathf.Abs(diff.x)*2.0;
            var diffy : float = Mathf.Abs(diff.z)*2.0;
   
            // Take the largest axis' distance, and match that aspect.
            // Match y to x's length
            if (diffx > diffy)
            {
               if (diffx < minimum.x)
                  zone.width = minimum.x;
               else
                  zone.width = diffx;
               zone.height = zone.width;
            }
            else // Match x to y's length
            {
               if (diffy < minimum.y)
                  zone.height = minimum.y;
               else
                  zone.height = diffy;
               zone.width = zone.height;
            }
            zone.center.x = firstPoint.x + (minimum.x/2.0);;
            zone.center.y = firstPoint.z + (minimum.y/2.0);
         }
         else // Not aspect locked
         {
            // 2nd point left of 1st
            if (hit.point.x < firstPoint.x)
            {
               zone.width = Mathf.Abs(hit.point.x-firstPoint.x) + minimum.x;
               zone.x = hit.point.x;
            }
            // 2nd point right of 1st
            else if (hit.point.x > firstPoint.x+minimum.x)
            {
               zone.width = (hit.point.x-firstPoint.x);
               zone.x = firstPoint.x;
            }
            else // within minimum zone width
            {
               zone.x = firstPoint.x;
               zone.width = minimum.x;
            }
      
            // 2nd point above first
            if (hit.point.z > firstPoint.z+minimum.y)
            {
               zone.height = Mathf.Abs(hit.point.z-firstPoint.z);
               zone.y = firstPoint.z;
            }
            else if (hit.point.z < firstPoint.z)
            {
               zone.height = Mathf.Abs(hit.point.z-firstPoint.z) + minimum.y;
               zone.y = hit.point.z;
            }
            else // within minimum zone height
            {
               zone.y = firstPoint.z;
               zone.height = minimum.y;
            }
         }
      }
   }
   else // First point hasn't been placed yet
   {
      zone.x = hit.point.x - (minimum.x/2.0);
      zone.y = hit.point.z - (minimum.y/2.0);
   }

   // Draw polygon to area scale
   if (lockAspect)
   {
      transform.position.x = zone.center.x;
      transform.position.z = zone.center.y;
   }
   else
   {
      transform.position.x = zone.x+zone.width/2.0;
      transform.position.z = zone.y+zone.height/2.0;
   }
   transform.position.y = hit.point.y + 0.2;
   if (scaleCursor)
      transform.localScale = Vector3(zone.width, transform.localScale.y, zone.height);
   //transform.rotation = Quaternion.FromToRotation(Vector3.up, hit.normal); // follow terrain
/*
   // Draw mana cost text inside the polygon
   cost = (costPerArea * (zone.width * zone.height));
   percentText.renderer.enabled = true;
   percentText.text = cost.ToString("#0");
   percentText.transform.position = transform.position;
   percentText.transform.position.y = transform.position.y + 0.2;
*/
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
   var c : Color = Color(r,g,b, alpha);
   color = c;
   SetChildrenColor(transform, c);
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

static function GetPrefabName(type : int) : String
{
   var str : String;
   switch (type)
   {
      case 0: str = "prefabs/abilities/AbilityBlastPrefab"; break;
      case 1: str = "prefabs/abilities/AbilityPaintPrefab"; break;
      case 2: str ="prefabs/abilities/AbilitySpeedModPrefab"; break;
      case 3: str = "prefabs/abilities/AbilityStunTowerPrefab"; break;
      default: break;
   }
   return str;
}