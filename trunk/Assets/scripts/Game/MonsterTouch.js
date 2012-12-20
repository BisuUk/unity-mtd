#pragma strict

var action : ActionType;
var color : Color;
var magnitude : float;
var destroyOnImpact : boolean;

function LateUpdate()
{
   // Jostle just a tiny bit so OnTriggerEnter fires
   // iTween doesn't trigger this automatically for some reason.
   transform.position.x += 0.001;
}

function SetColor(newColor : Color)
{
   color = newColor;
}

function OnTriggerEnter(other : Collider)
{
   var monster : Monster = other.GetComponent(Monster);
   if (monster)
   {
      switch (action)
      {
         case ActionType.ACTION_DAMAGE:
            //if (!Network.isClient)
            //   unit.Kill();
            break;

         case ActionType.ACTION_COLOR_CHANGE:
            monster.SetColor(Utility.ChangeColorTo(monster.color, color, magnitude));
            break;
      }

      if (destroyOnImpact)
         Destroy(gameObject);
   }
}