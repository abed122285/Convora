import React, { useState } from 'react';
import {
  MapPin,
  MessageSquare,
  Phone,
  Search,
  UserCheck,
  Users,
} from 'lucide-react';
import { useConvora } from '../../context/ConvoraContext';
import {
  formatDzd,
  getChannelLabel,
  getLeadStageLabel,
} from '../../lib/i18n/translations';
import type { LeadStage } from '../../types/domain';

export function CustomersView() {
  const { locale, snapshot, navigate, setSelectedConversationId } =
    useConvora();
  const [search, setSearch] = useState('');

  if (!snapshot) return null;

  const filtered = snapshot.customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(q) ||
      c.wilaya.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-[#20231F]">
            {locale === 'ar' ? 'سجل الزبائن' : 'Répertoire Clients'}
          </h1>
          <p className="text-xs text-[#737A74]">
            {locale === 'ar'
              ? 'ملفات الزبائن الموحدة مع سجل الطلبيات والمحادثات الخاصة بمتجرك فقط.'
              : 'Profils clients unifiés avec historique des commandes et conversations de votre boutique.'}
          </p>
        </div>

        <div className="relative w-full sm:w-72 flex items-center">
          <Search className="w-4 h-4 text-[#737A74] absolute start-3 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              locale === 'ar'
                ? 'بحث بالاسم، الهاتف، أو الولاية...'
                : 'Rechercher par nom, téléphone ou wilaya...'
            }
            className="w-full h-9 bg-white border border-[#E5E8E2] rounded-lg ps-9 pe-3 text-xs"
          />
        </div>
      </div>

      <div className="bg-white border border-[#E5E8E2] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-[#F8F7F2] text-[#737A74] border-b border-[#E5E8E2]">
              <tr>
                <th className="py-3 px-4 text-start font-medium">
                  {locale === 'ar' ? 'الزبون' : 'Client'}
                </th>
                <th className="py-3 px-4 text-start font-medium">
                  {locale === 'ar' ? 'رقم الهاتف' : 'Téléphone'}
                </th>
                <th className="py-3 px-4 text-start font-medium">
                  {locale === 'ar' ? 'الولاية' : 'Wilaya'}
                </th>
                <th className="py-3 px-4 text-start font-medium">
                  {locale === 'ar' ? 'القناة' : 'Canal'}
                </th>
                <th className="py-3 px-4 text-end font-medium">
                  {locale === 'ar' ? 'إجمالي المشتريات' : 'Total dépensé'}
                </th>
                <th className="py-3 px-4 text-end font-medium">
                  {locale === 'ar' ? 'إجراء' : 'Action'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8E2]">
              {filtered.map((cust) => {
                const linkedConv = snapshot.conversations.find(
                  (c) => c.customer_id === cust.id
                );
                return (
                  <tr key={cust.id} className="hover:bg-[#F8F7F2]/60">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#20231F]">
                          {cust.full_name}{' '}
                          {cust.is_vip && (
                            <span className="text-[#B8A27A]">· VIP</span>
                          )}
                        </span>
                        <span className="text-[11px] text-[#737A74]">
                          {cust.notes}
                        </span>
                      </div>
                    </td>
                    <td
                      className="py-3 px-4 font-num text-[#20231F]"
                      dir="ltr"
                    >
                      {cust.phone}
                    </td>
                    <td className="py-3 px-4 text-[#737A74]">{cust.wilaya}</td>
                    <td className="py-3 px-4 text-[#737A74]">
                      {getChannelLabel(cust.channel, locale)}
                    </td>
                    <td className="py-3 px-4 text-end font-num font-semibold text-[#20231F]">
                      {formatDzd(cust.lifetime_spend_dzd, locale)} ({cust.total_orders})
                    </td>
                    <td className="py-3 px-4 text-end">
                      {linkedConv && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedConversationId(linkedConv.id);
                            navigate('/app/inbox');
                          }}
                          className="px-3 py-1.5 bg-[#F8F7F2] hover:bg-[#D9E5D4] text-[#202C28] rounded-lg border border-[#E5E8E2] font-medium"
                        >
                          {locale === 'ar' ? 'فتح المحادثة' : 'Conversation'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function LeadsView() {
  const {
    locale,
    snapshot,
    updateLeadStage,
    navigate,
    setSelectedConversationId,
  } = useConvora();
  const [stageFilter, setStageFilter] = useState<'all' | LeadStage>('all');

  if (!snapshot) return null;

  const filteredLeads = snapshot.leads.filter((l) =>
    stageFilter === 'all' ? true : l.stage === stageFilter
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-[#20231F]">
            {locale === 'ar'
              ? 'إدارة الفرص البيعية (Leads Pipeline)'
              : 'Suivi des Prospects (Leads)'}
          </h1>
          <p className="text-xs text-[#737A74]">
            {locale === 'ar'
              ? 'تحويل استفسارات واتساب وإنستغرام إلى طلبيات مؤكدة مع متابعة منظمة.'
              : 'Transformez les discussions entrantes en commandes qualifiées.'}
          </p>
        </div>

        <div
          role="group"
          aria-label="Lead stage filter"
          className="flex flex-wrap items-center gap-1 bg-white border border-[#E5E8E2] p-1 rounded-lg text-xs"
        >
          {(
            [
              'all',
              'new',
              'qualified',
              'high_intent',
              'follow_up',
              'converted',
            ] as const
          ).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStageFilter(st)}
              className={`px-3 py-1.5 rounded font-medium ${
                stageFilter === st
                  ? 'bg-[#202C28] text-white'
                  : 'text-[#737A74] hover:text-[#20231F]'
              }`}
            >
              {st === 'all'
                ? locale === 'ar'
                  ? 'كل المراحل'
                  : 'Toutes'
                : getLeadStageLabel(st, locale)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLeads.map((lead) => (
          <div
            key={lead.id}
            className="bg-white border border-[#E5E8E2] rounded-xl p-5 flex flex-col justify-between gap-4"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#20231F]">
                  {lead.customer_name}
                </span>
                <span className="text-xs font-semibold text-[#B8A27A]">
                  {getLeadStageLabel(lead.stage, locale)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#737A74]">
                <MapPin className="w-3.5 h-3.5" />
                <span>{lead.wilaya}</span>
                <span>·</span>
                <span className="font-num" dir="ltr">
                  {lead.customer_phone}
                </span>
              </div>

              <div className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-3 text-xs flex flex-col gap-1">
                <span className="text-[#737A74]">
                  {locale === 'ar'
                    ? 'المنتجات المهتم بها:'
                    : 'Produits d’intérêt :'}
                </span>
                <span className="font-medium text-[#20231F]">
                  {lead.interested_products.join('، ')}
                </span>
                <span className="font-num font-semibold text-[#202C28] pt-1">
                  {locale === 'ar' ? 'القيمة التقديرية:' : 'Valeur estimée :'}{' '}
                  {formatDzd(lead.estimated_value_dzd, locale)}
                </span>
              </div>

              <p className="text-xs text-[#737A74] leading-relaxed">
                {lead.notes}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#E5E8E2]">
              <select
                aria-label={locale === 'ar' ? 'تحديث مرحلة الفرصة' : 'Changer étape'}
                value={lead.stage}
                onChange={(e) =>
                  updateLeadStage(lead.id, e.target.value as LeadStage)
                }
                className="h-8 bg-[#F8F7F2] border border-[#E5E8E2] rounded px-2 text-xs text-[#20231F]"
              >
                <option value="new">{getLeadStageLabel('new', locale)}</option>
                <option value="qualified">
                  {getLeadStageLabel('qualified', locale)}
                </option>
                <option value="high_intent">
                  {getLeadStageLabel('high_intent', locale)}
                </option>
                <option value="follow_up">
                  {getLeadStageLabel('follow_up', locale)}
                </option>
                <option value="converted">
                  {getLeadStageLabel('converted', locale)}
                </option>
                <option value="lost">
                  {getLeadStageLabel('lost', locale)}
                </option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setSelectedConversationId(lead.conversation_id);
                  navigate('/app/inbox');
                }}
                className="h-8 px-3 bg-[#202C28] text-white text-xs font-medium rounded-lg hover:bg-[#2C3D38] flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{locale === 'ar' ? 'المحادثة' : 'Discussion'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
