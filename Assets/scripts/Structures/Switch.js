#pragma strict
#pragma downcast

var triggeredTransforms : Transform[];
var requiredColor : Color;
var requiredUnitTypes : int[];
var holdTime : float;
var staySwitchedOn : boolean;
var timer : TextMesh;
var netView : NetworkView;

private var colliders : List.<Transform>;
private var triggerTime : float;
private var countDown : boolean;

function Awake()
{
   colliders = new List.<Transform>();

   SetRequiredColor(requiredColor);

   // Disable collider on clients
   if (Network.isClient)
      GetComponent(Collider).enabled = false;
   timer.gameObject.SetActive(false);
}

function SetRequiredColor(color : Color)
{
   requiredColor = color;
   renderer.material.color = requiredColor;
}

function OnTriggerEnter(other : Collider)
{
   var unit : Unit = other.GetComponent(Unit);

   var noCollidersBefore : boolean = (colliders.Count==0);

   if (unit && isRequiredUnitType(unit.unitType) && isRequiredColor(unit.actualColor))
   {
      if (colliders.Contains(other.transform) == false)
         colliders.Add(other.transform);

      if (noCollidersBefore && triggerTime==0.0)
      {
         if (Network.isServer)
            netView.RPC("ToClientSetTrigger", RPCMode.Others, true);

         for (var trigger : Transform in triggeredTransforms)
            trigger.SendMessage("Trigger", SendMessageOptions.DontRequireReceiver);
      }

      // Stop timer a unit is standing on the switch
      triggerTime = 0.0;
      timer.gameObject.SetActive(false);
   }
}

function SwitchOff()
{
   if (colliders.Count==0)
   {
      triggerTime = 0.0;
      timer.gameObject.SetActive(false);

      if (Network.isServer)
         netView.RPC("ToClientSetTrigger", RPCMode.Others, false);
   
      for (var trigger : Transform in triggeredTransforms)
         trigger.SendMessage("Untrigger", SendMessageOptions.DontRequireReceiver);
   }
}

function OnTriggerExit(other : Collider)
{
   if (!staySwitchedOn)
   {
      var unit : Unit = other.GetComponent(Unit);
      if (unit && isRequiredUnitType(unit.unitType) && isRequiredColor(unit.actualColor))
      {
         if (colliders.Contains(other.transform))
         {
            colliders.Remove(other.transform);
   
            if (colliders.Count==0)
            {
               if (holdTime > 0)
                  triggerTime = Time.time;
               else
                  SwitchOff();
            }
         }
      }
   }
}

private function isRequiredColor(unitColor : Color) : boolean
{
   //Debug.Log("isRequiredColor: u="+unitColor+" r="+requiredColor);
   return (unitColor == requiredColor);
}

private function isRequiredUnitType(unitType : int) : boolean
{
   for (var i : int in requiredUnitTypes)
   {
      if (unitType == i)
         return true;
   }
   return false;
}

@RPC
function ToClientSetTrigger(triggered : boolean)
{
   for (var trigger : Transform in triggeredTransforms)
      trigger.SendMessage(((triggered) ? "Trigger" : "Untrigger"), SendMessageOptions.DontRequireReceiver);
}

function OnMouseEnter()
{
   for (var trigger : Transform in triggeredTransforms)
      HilightSwitchAndTriggersRecursive(trigger, true);
   HilightSwitchAndTriggersRecursive(transform, true);
}

function OnMouseExit()
{
   for (var trigger : Transform in triggeredTransforms)
      HilightSwitchAndTriggersRecursive(trigger, false);
   HilightSwitchAndTriggersRecursive(transform, false);
}

private function HilightSwitchAndTriggersRecursive(t : Transform, hilight : boolean)
{
   if (t.renderer)
   {
      t.renderer.material.SetColor("_OutlineColor", (hilight) ? Color.green : Color.black);
      t.renderer.material.SetFloat("_Outline", (hilight) ? 0.007 : 0.001);
   }

   for (var child : Transform in t)
      HilightSwitchAndTriggersRecursive(child, hilight);
}

function Update()
{
   if (holdTime > 0 && triggerTime > 0.0)
   {
      timer.gameObject.SetActive(true);
      var diff : float = (holdTime - (Time.time - triggerTime));
      if (diff <= 0.0)
         SwitchOff();
      else
         timer.text = diff.ToString("0.0");
   }
}