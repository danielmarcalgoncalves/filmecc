import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

/**
 * PremiumPage
 * Página completa do Plano Premium do Catálogo Tom Hanks.
 *
 * Apresenta:
 * - Benefícios do Plano Premium vs. Plano Gratuito
 * - Preço e periodicidade
 * - Botão para iniciar o checkout no Stripe
 * - Estado de retorno após checkout (sucesso/cancelamento)
 * - Status atual da assinatura se o usuário já for Premium
 */
export default function PremiumPage({ user, onBack, showToast, onUpdateUser }) {
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Verifica se o usuário retornou de um checkout
  const urlParams = new URLSearchParams(window.location.search);
  const checkoutResult = urlParams.get('checkout');

  const isPremium = user?.papel === 'premium' || user?.papel === 'admin';

  // Carrega o status atual da assinatura do usuário
  useEffect(() => {
    if (!user) {
      setLoadingStatus(false);
      return;
    }

    api.stripe.getStatus()
      .then((data) => {
        setSubscriptionStatus(data);
        // Atualiza estado do usuário no app principal se necessário
        if (data.isPremium && user.papel !== 'premium' && user.papel !== 'admin') {
          onUpdateUser && onUpdateUser({ papel: 'premium', role: 'premium' });
        }
      })
      .catch(() => {
        // Silencioso — status não é crítico para exibir a página
      })
      .finally(() => setLoadingStatus(false));
  }, [user]);

  const handleStartCheckout = async () => {
    if (!user) {
      showToast('Faça login para assinar o Plano Premium.', 'error');
      return;
    }

    setLoadingCheckout(true);
    try {
      const data = await api.stripe.createCheckout();
      if (data.url) {
        // Redireciona para a página de checkout hospedada pelo Stripe
        window.location.href = data.url;
      } else {
        showToast('Erro ao iniciar o checkout. Tente novamente.', 'error');
      }
    } catch (err) {
      if (err.status === 400 && err.message?.includes('já possui')) {
        showToast('Você já possui o Plano Premium ativo!', 'success');
        // Recarrega status
        api.stripe.getStatus().then(setSubscriptionStatus).catch(() => {});
      } else if (err.message?.includes('STRIPE_PRICE_ID') || err.message?.includes('não está configurado')) {
        showToast('O serviço de pagamento ainda não foi configurado pelo administrador.', 'error');
      } else {
        showToast(err.message || 'Erro ao iniciar o checkout.', 'error');
      }
    } finally {
      setLoadingCheckout(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  };

  return (
    <div className="premium-page animate-fade-in">
      {/* Botão Voltar */}
      <div className="premium-top-bar">
        <button
          type="button"
          className="profile-back-btn"
          onClick={onBack}
          title="Voltar ao catálogo"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Voltar ao Catálogo
        </button>
      </div>

      {/* Banner de retorno do checkout */}
      {checkoutResult === 'success' && (
        <div className="premium-checkout-banner premium-checkout-success">
          <div className="premium-banner-icon">🎉</div>
          <div>
            <h3>Checkout concluído!</h3>
            <p>
              Seu pagamento está sendo processado pelo Stripe.
              O acesso Premium será ativado em instantes após a confirmação.
              {!isPremium && ' Aguarde alguns momentos e recarregue a página.'}
            </p>
          </div>
        </div>
      )}

      {checkoutResult === 'cancelled' && (
        <div className="premium-checkout-banner premium-checkout-cancelled">
          <div className="premium-banner-icon">↩️</div>
          <div>
            <h3>Checkout cancelado</h3>
            <p>Você cancelou o processo de assinatura. Quando quiser, é só clicar em "Assinar Premium" novamente.</p>
          </div>
        </div>
      )}

      {/* Hero da página Premium */}
      <div className="premium-hero">
        <div className="premium-hero-badge">
          <span className="premium-crown">👑</span>
          <span>PLANO PREMIUM</span>
        </div>
        <h1 className="premium-hero-title">
          Experiência <span className="premium-gold-text">sem limites</span><br />para cinéfilos de verdade
        </h1>
        <p className="premium-hero-subtitle">
          Desbloqueie favoritos ilimitados, um selo exclusivo e o status de
          cinéfila VIP no Catálogo Tom Hanks.
        </p>
      </div>

      {/* Conteúdo Principal */}
      <div className="premium-content-wrapper">

        {/* Comparação de planos */}
        <div className="premium-plans-grid">

          {/* Plano Gratuito */}
          <div className="premium-plan-card premium-plan-free">
            <div className="premium-plan-header">
              <span className="premium-plan-tag">GRATUITO</span>
              <h2 className="premium-plan-name">Plano Básico</h2>
              <div className="premium-plan-price">
                <span className="premium-price-value">R$ 0</span>
                <span className="premium-price-period">/mês</span>
              </div>
            </div>
            <ul className="premium-features-list">
              <li className="premium-feature-item premium-feature-ok">
                <span className="feature-icon">✓</span>
                Acesso ao catálogo completo de filmes
              </li>
              <li className="premium-feature-item premium-feature-ok">
                <span className="feature-icon">✓</span>
                Comentários e avaliações
              </li>
              <li className="premium-feature-item premium-feature-ok">
                <span className="feature-icon">✓</span>
                Listas personalizadas e Watchlist
              </li>
              <li className="premium-feature-item premium-feature-limit">
                <span className="feature-icon">⚠️</span>
                <span>
                  <strong>5 favoritos</strong> apenas
                </span>
              </li>
              <li className="premium-feature-item premium-feature-no">
                <span className="feature-icon">✗</span>
                Sem selo Premium no perfil
              </li>
            </ul>
            <div className="premium-plan-cta-area">
              <span className="premium-current-plan-badge">Plano atual (visitante)</span>
            </div>
          </div>

          {/* Plano Premium */}
          <div className={`premium-plan-card premium-plan-paid ${isPremium ? 'premium-plan-active' : ''}`}>
            <div className="premium-plan-popular-badge">⭐ MAIS POPULAR</div>
            <div className="premium-plan-header">
              <span className="premium-plan-tag premium-plan-tag-paid">PREMIUM</span>
              <h2 className="premium-plan-name">Plano Premium</h2>
              <div className="premium-plan-price">
                <span className="premium-price-value premium-price-gold">R$ 9,90</span>
                <span className="premium-price-period">/mês</span>
              </div>
              <p className="premium-price-note">Cobrado mensalmente · Cancele quando quiser</p>
            </div>
            <ul className="premium-features-list">
              <li className="premium-feature-item premium-feature-ok">
                <span className="feature-icon">✓</span>
                Acesso ao catálogo completo de filmes
              </li>
              <li className="premium-feature-item premium-feature-ok">
                <span className="feature-icon">✓</span>
                Comentários e avaliações
              </li>
              <li className="premium-feature-item premium-feature-ok">
                <span className="feature-icon">✓</span>
                Listas personalizadas e Watchlist
              </li>
              <li className="premium-feature-item premium-feature-premium">
                <span className="feature-icon">♾️</span>
                <span>
                  <strong>Favoritos ilimitados</strong>
                  <em className="feature-badge">EXCLUSIVO</em>
                </span>
              </li>
              <li className="premium-feature-item premium-feature-premium">
                <span className="feature-icon">👑</span>
                <span>
                  <strong>Selo Premium</strong> no perfil
                  <em className="feature-badge">EXCLUSIVO</em>
                </span>
              </li>
            </ul>

            <div className="premium-plan-cta-area">
              {isPremium ? (
                <div className="premium-active-state">
                  <div className="premium-active-badge">
                    <span>👑</span>
                    <span>Plano Premium Ativo</span>
                  </div>
                  {subscriptionStatus?.subscription?.periodoFim && (
                    <p className="premium-renews-text">
                      Próxima renovação: {formatDate(subscriptionStatus.subscription.periodoFim)}
                    </p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  id="btn-assinar-premium"
                  className="btn-premium-cta"
                  onClick={handleStartCheckout}
                  disabled={loadingCheckout || !user}
                  title={!user ? 'Faça login para assinar' : 'Assinar o Plano Premium'}
                >
                  {loadingCheckout ? (
                    <>
                      <span className="btn-spinner-sm" />
                      <span>Aguarde...</span>
                    </>
                  ) : !user ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span>Faça login para assinar</span>
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span>Assinar por R$ 9,90/mês</span>
                    </>
                  )}
                </button>
              )}
              <p className="premium-cta-note">
                🔒 Pagamento 100% seguro via Stripe · Modo de teste ativado
              </p>
            </div>
          </div>
        </div>

        {/* Seção de como funciona */}
        <div className="premium-how-section">
          <h2 className="premium-section-title">Como funciona?</h2>
          <div className="premium-steps-grid">
            <div className="premium-step">
              <div className="premium-step-number">1</div>
              <h3>Clique em "Assinar"</h3>
              <p>Você será redirecionado para a página segura de checkout hospedada pelo Stripe.</p>
            </div>
            <div className="premium-step">
              <div className="premium-step-number">2</div>
              <h3>Pague com segurança</h3>
              <p>O Stripe processa seu pagamento. Nenhum dado de cartão toca nosso servidor.</p>
            </div>
            <div className="premium-step">
              <div className="premium-step-number">3</div>
              <h3>Acesso imediato</h3>
              <p>Após a confirmação, seu perfil é atualizado automaticamente para Premium.</p>
            </div>
          </div>
        </div>

        {/* Nota sobre o modo de teste */}
        <div className="premium-test-notice">
          <div className="premium-test-icon">🧪</div>
          <div>
            <h3>Modo de Teste Ativo</h3>
            <p>
              Esta implementação utiliza o <strong>ambiente de testes do Stripe</strong>.
              Nenhuma cobrança real é realizada. Para testar, use o cartão de teste:
            </p>
            <div className="premium-test-cards">
              <div className="test-card">
                <span className="test-card-number">4242 4242 4242 4242</span>
                <span className="test-card-desc">Qualquer CVV e data futura → Pagamento aprovado</span>
              </div>
              <div className="test-card test-card-fail">
                <span className="test-card-number">4000 0000 0000 0002</span>
                <span className="test-card-desc">Qualquer CVV e data futura → Pagamento recusado</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
