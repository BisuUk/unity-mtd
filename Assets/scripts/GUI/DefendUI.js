#pragma strict
#pragma downcast

var controlAreaSets : Transform[];
var colorArea : Transform;

private var cursor : DefendGUICursor;

function Start()
{
   SwitchControlSet(0);
   Utility.SetActiveRecursive(colorArea, false);
}
/*
function OnGUI()
{
   var e : Event = Event.current;

   if (e.isMouse)
   {
      // LMB - Check player can afford tower and legal placement
      if (e.button == 0)
      {
         if (cursor.legalLocation == false)
            GUIControl.OnScreenMessage("Invalid tower location.", Color.red, 1.5);
         else
         {
            if (cursor.mode == 0)
            {
               if (cursor.tower.placeWithOrient)
                  cursor.SetMode(1);
               else if (cursor.tower.placeFOV)
                  cursor.SetMode(2);
               else
               {
                  // NOTE: Client is calculating cost, unsecure.
                  //Game.player.credits -= costValue;
            
                  // Place tower in scene
                  if (!Network.isClient)
                     Game.control.CreateTower(
                        cursor.tower.type,
                        cursor.transform.position, cursor.transform.rotation,
                        cursor.tower.range,
                        cursor.tower.fov,
                        cursor.tower.fireRate,
                        cursor.tower.strength,
                        cursor.tower.effect,
                        cursor.tower.color.r, cursor.tower.color.g, cursor.tower.color.b,
                        cursor.tower.targetingBehavior,
                        cursor.tower.FOV.position);
                  else
                     Game.control.netView.RPC("CreateTower", RPCMode.Server,
                        cursor.tower.type,
                        cursor.transform.position, cursor.transform.rotation,
                        cursor.tower.range,
                        cursor.tower.fov,
                        cursor.tower.fireRate,
                        cursor.tower.strength,
                        cursor.tower.effect,
                        cursor.tower.color.r, cursor.tower.color.g, cursor.tower.color.b,
                        cursor.tower.targetingBehavior,
                        cursor.tower.FOV.position);
               }

            }
         }
      }

   }
}
*/


function OnClick()
{
   if (cursor)
   {
      if (cursor.legalLocation == false)
         GUIControl.OnScreenMessage("Invalid tower location.", Color.red, 1.5);
      else
      {
         if (cursor.NextMode())
         {
            // NOTE: Client is calculating cost, unsecure.
            //Game.player.credits -= costValue;

            // Place tower in scene
            if (!Network.isClient)
               Game.control.CreateTower(
                  cursor.tower.type,
                  cursor.transform.position, cursor.transform.rotation,
                  cursor.tower.range,
                  cursor.tower.fov,
                  cursor.tower.fireRate,
                  cursor.tower.strength,
                  cursor.tower.effect,
                  cursor.tower.color.r, cursor.tower.color.g, cursor.tower.color.b,
                  cursor.tower.targetingBehavior,
                  cursor.tower.FOV.position);
            else
               Game.control.netView.RPC("CreateTower", RPCMode.Server,
                  cursor.tower.type,
                  cursor.transform.position, cursor.transform.rotation,
                  cursor.tower.range,
                  cursor.tower.fov,
                  cursor.tower.fireRate,
                  cursor.tower.strength,
                  cursor.tower.effect,
                  cursor.tower.color.r, cursor.tower.color.g, cursor.tower.color.b,
                  cursor.tower.targetingBehavior,
                  cursor.tower.FOV.position);
            DestroyCursor();
         }

      }
   }
}

function DestroyCursor()
{
   if (cursor)
   {
      for (var child : Transform in cursor.transform)
         Destroy(child.gameObject);
      Destroy(cursor.gameObject);
   }
}

function NewCursor(type : int)
{
   DestroyCursor();

   var prefabName : String = TowerUtil.PrefabName(type);
   var cursorObject : GameObject = Instantiate(Resources.Load(prefabName, GameObject), Vector3.zero, Quaternion.identity);
   cursorObject.name = "DefendGUICursor";
   cursorObject.tag = "";
   cursorObject.GetComponent(Collider).enabled = false;
   cursor = cursorObject.AddComponent(DefendGUICursor);
   cursor.SetMode(0);

   cursorObject.SendMessage("SetDefaultBehaviorEnabled", false); // remove default behavior
}

function OnAttributeBack()
{
   SwitchControlSet(0);
   Utility.SetActiveRecursive(colorArea, false);
}

function OnMortarTower()
{
   NewCursor(3);
   SwitchControlSet(1);
   Utility.SetActiveRecursive(colorArea, true);
}

function OnRangedTower()
{
   NewCursor(1);
   SwitchControlSet(1);
   Utility.SetActiveRecursive(colorArea, true);

}

function OnSlowTower()
{
   
}

function OnPainterTower()
{
   NewCursor(2);
   SwitchControlSet(1);
   colorArea.gameObject.active = true;
}

function SwitchControlSet(newSet : int)
{
   for (var i : int=0; i<controlAreaSets.length; i++)
   {
      Utility.SetActiveRecursive(controlAreaSets[i], (i == newSet));
   }
}


function OnRed()
{
   //var c : DefendGUICursor = GUIControl.cursorObject.GetComponent(DefendGUICursor);
   cursor.tower.SetColor(Color.red);
}